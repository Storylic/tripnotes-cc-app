// app/editor/[id]/actions-granular.ts
// Granular save actions that only update changed components

'use server';

import { db } from '@/db/client';
import { trips, tripDays, activities, gems } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { GranularCacheService } from '@/lib/cache/granular-cache-service';
import type { TripData, TripDay, Activity } from './lib/types';

interface SaveChanges {
  tripId: string;
  metadata?: {
    title?: string;
    subtitle?: string;
    description?: string | null;
    destination?: string;
    durationDays?: number;
    priceCents?: number;
    status?: string;
  };
  days?: {
    added?: TripDay[];
    updated?: TripDay[];
    deleted?: string[];
  };
  activities?: {
    added?: Activity[];
    updated?: Activity[];
    deleted?: string[];
  };
}

/**
 * Save only changed components (granular save)
 */
export async function saveGranularChanges(changes: SaveChanges) {
  const supabase = await createClient();
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const [existingTrip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, changes.tripId))
    .limit(1);

  if (!existingTrip || existingTrip.creatorId !== user.id) {
    throw new Error('Unauthorized');
  }

  const startTime = performance.now();
  const cacheUpdates = {
    metadata: changes.metadata ? { ...existingTrip, ...changes.metadata } : undefined,
    days: new Map<string, TripDay>(),
    activities: new Map<string, Activity>(),
    structure: undefined as any,
  };

  try {
    // 1. Update metadata if changed
    if (changes.metadata && Object.keys(changes.metadata).length > 0) {
      console.log('[Save] Updating metadata');
      await db
        .update(trips)
        .set({
          ...changes.metadata,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, changes.tripId));
    }

    // 2. Handle day changes
    if (changes.days) {
      // Add new days
      if (changes.days.added && changes.days.added.length > 0) {
        console.log(`[Save] Adding ${changes.days.added.length} days`);
        for (const day of changes.days.added) {
          const [newDay] = await db.insert(tripDays).values({
            tripId: changes.tripId,
            dayNumber: day.dayNumber,
            title: day.title,
            subtitle: day.subtitle,
          }).returning();
          
          cacheUpdates.days.set(newDay.id, {
            ...day,
            id: newDay.id,
          });
        }
      }

      // Update existing days
      if (changes.days.updated && changes.days.updated.length > 0) {
        console.log(`[Save] Updating ${changes.days.updated.length} days`);
        for (const day of changes.days.updated) {
          await db
            .update(tripDays)
            .set({
              title: day.title,
              subtitle: day.subtitle,
              dayNumber: day.dayNumber,
              updatedAt: new Date(),
            })
            .where(eq(tripDays.id, day.id));
          
          cacheUpdates.days.set(day.id, day);
        }
      }

      // Delete days
      if (changes.days.deleted && changes.days.deleted.length > 0) {
        console.log(`[Save] Deleting ${changes.days.deleted.length} days`);
        await db
          .delete(tripDays)
          .where(inArray(tripDays.id, changes.days.deleted));
        
        // Invalidate cache for deleted days
        for (const dayId of changes.days.deleted) {
          await GranularCacheService.invalidateComponent(changes.tripId, 'day', dayId);
        }
      }
    }

    // 3. Handle activity changes
    if (changes.activities) {
      // Add new activities
      if (changes.activities.added && changes.activities.added.length > 0) {
        console.log(`[Save] Adding ${changes.activities.added.length} activities`);
        for (const activity of changes.activities.added) {
          const [newActivity] = await db.insert(activities).values({
            dayId: activity.dayId,
            timeBlock: activity.timeBlock,
            description: activity.description,
            orderIndex: activity.orderIndex,
          }).returning();
          
          cacheUpdates.activities.set(newActivity.id, {
            ...activity,
            id: newActivity.id,
          });
        }
      }

      // Update existing activities
      if (changes.activities.updated && changes.activities.updated.length > 0) {
        console.log(`[Save] Updating ${changes.activities.updated.length} activities`);
        for (const activity of changes.activities.updated) {
          await db
            .update(activities)
            .set({
              timeBlock: activity.timeBlock,
              description: activity.description,
              orderIndex: activity.orderIndex,
              updatedAt: new Date(),
            })
            .where(eq(activities.id, activity.id));
          
          cacheUpdates.activities.set(activity.id, activity);
        }
      }

      // Delete activities
      if (changes.activities.deleted && changes.activities.deleted.length > 0) {
        console.log(`[Save] Deleting ${changes.activities.deleted.length} activities`);
        await db
          .delete(activities)
          .where(inArray(activities.id, changes.activities.deleted));
        
        // Invalidate cache for deleted activities
        for (const activityId of changes.activities.deleted) {
          await GranularCacheService.invalidateComponent(changes.tripId, 'activity', activityId);
        }
      }
    }

    const elapsed = performance.now() - startTime;
    console.log(`[Save] Database operations completed in ${elapsed.toFixed(2)}ms`);

    // 4. Update cache with smart save
    await GranularCacheService.smartSave(changes.tripId, cacheUpdates);

    // 5. Update structure if days were added/removed
    if (changes.days?.added || changes.days?.deleted) {
      // Rebuild structure
      const structure = await buildTripStructure(changes.tripId);
      if (structure) {
        await GranularCacheService.setStructure(changes.tripId, structure);
      }
    }

    const totalElapsed = performance.now() - startTime;
    console.log(`[Save] Total save completed in ${totalElapsed.toFixed(2)}ms`);

    return { success: true };
  } catch (error) {
    console.error('[Save] Error:', error);
    throw error;
  }
}

/**
 * Save single activity (ultra-fast for typing)
 */
export async function saveActivityOnly(
  tripId: string,
  activityId: string,
  updates: Partial<Activity>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    // Update in database
    await db
      .update(activities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));

    // Update in cache
    const existing = await GranularCacheService.getActivity(activityId);
    if (existing) {
      const updated = { ...existing, ...updates };
      await GranularCacheService.setActivity(activityId, updated, true);
    }

    // Mark full trip as stale
    await GranularCacheService.markStale(tripId);

    return { success: true };
  } catch (error) {
    console.error('[Save] Activity save error:', error);
    throw error;
  }
}

/**
 * Save single day metadata (title, subtitle)
 */
export async function saveDayMetadata(
  tripId: string,
  dayId: string,
  updates: { title?: string; subtitle?: string | null }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    // Update in database
    await db
      .update(tripDays)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tripDays.id, dayId));

    // Update in cache
    const existing = await GranularCacheService.getDay(dayId);
    if (existing) {
      const updated = { ...existing, ...updates };
      await GranularCacheService.setDay(dayId, updated, true);
    }

    // Mark full trip as stale
    await GranularCacheService.markStale(tripId);

    return { success: true };
  } catch (error) {
    console.error('[Save] Day metadata save error:', error);
    throw error;
  }
}

/**
 * Build trip structure from database
 */
async function buildTripStructure(tripId: string) {
  const days = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, tripId))
    .orderBy(tripDays.dayNumber);

  if (days.length === 0) return null;

  const dayIds = days.map(d => d.id);
  
  const allActivities = await db
    .select()
    .from(activities)
    .where(inArray(activities.dayId, dayIds))
    .orderBy(activities.orderIndex);

  const structure = {
    tripId,
    dayIds,
    dayMap: {} as Record<string, { activityIds: string[] }>,
    activityMap: {} as Record<string, { gemIds: string[] }>,
    version: 1,
    lastModified: new Date().toISOString(),
  };

  // Build day map
  days.forEach(day => {
    structure.dayMap[day.id] = {
      activityIds: allActivities
        .filter(a => a.dayId === day.id)
        .map(a => a.id),
    };
  });

  // Build activity map (gems would be added here)
  allActivities.forEach(activity => {
    structure.activityMap[activity.id] = {
      gemIds: [], // Would load gems here
    };
  });

  return structure;
}