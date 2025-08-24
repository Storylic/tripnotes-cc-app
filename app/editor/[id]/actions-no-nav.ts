// app/editor/[id]/actions-no-nav.ts
// Server actions that don't cause navigation

'use server';

import { db } from '@/db/client';
import { trips, tripDays, activities, gems } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { TripCacheService, warmCacheAfterSave } from '@/lib/cache/trip-cache-service';

interface SaveTripData {
  id: string;
  title: string;
  subtitle: string;
  description: string | null;
  destination: string;
  durationDays: number;
  priceCents: number;
  status: string;
  days: Array<{
    id: string;
    dayNumber: number;
    title: string;
    subtitle: string | null;
    activities: Array<{
      id: string;
      timeBlock: string;
      description: string;
      orderIndex: number;
      gems: Array<{
        id: string;
        title: string;
        description: string;
        gemType: string;
      }>;
    }>;
  }>;
}

export async function saveTripWithoutNavigation(tripData: SaveTripData) {
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
    .where(eq(trips.id, tripData.id))
    .limit(1);

  if (!existingTrip || existingTrip.creatorId !== user.id) {
    throw new Error('Unauthorized');
  }

  try {
    console.log('[Save] Starting save for trip:', tripData.id);
    const saveStart = performance.now();

    // Store new IDs to return to client
    const newIdMap: Record<string, string> = {};

    // 1. Update trip metadata
    await db
      .update(trips)
      .set({
        title: tripData.title,
        subtitle: tripData.subtitle,
        description: tripData.description,
        destination: tripData.destination,
        durationDays: tripData.durationDays,
        priceCents: tripData.priceCents,
        status: tripData.status,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripData.id));

    // 2. Get ALL existing days for this trip
    const existingDays = await db
      .select()
      .from(tripDays)
      .where(eq(tripDays.tripId, tripData.id));

    const existingDayIds = existingDays.map(d => d.id);
    const currentDayIds = tripData.days
      .filter(d => !d.id.startsWith('temp-'))
      .map(d => d.id);

    // Delete days that are no longer in the data
    const daysToDelete = existingDayIds.filter(id => !currentDayIds.includes(id));
    if (daysToDelete.length > 0) {
      console.log('[Save] Deleting days:', daysToDelete);
      await db
        .delete(tripDays)
        .where(inArray(tripDays.id, daysToDelete));
    }

    // 3. Process each day
    for (const day of tripData.days) {
      let dayId = day.id;

      if (day.id.startsWith('temp-')) {
        // Create new day
        const [newDay] = await db.insert(tripDays).values({
          tripId: tripData.id,
          dayNumber: day.dayNumber,
          title: day.title,
          subtitle: day.subtitle,
        }).returning();
        
        dayId = newDay.id;
        newIdMap[day.id] = dayId; // Track the new ID
        console.log('[Save] Created new day:', dayId);
      } else {
        // Update existing day
        await db
          .update(tripDays)
          .set({
            title: day.title,
            subtitle: day.subtitle,
            dayNumber: day.dayNumber,
            updatedAt: new Date(),
          })
          .where(eq(tripDays.id, day.id));
      }

      // 4. Handle activities for this day
      const existingActivities = await db
        .select()
        .from(activities)
        .where(eq(activities.dayId, dayId));

      const existingActivityIds = existingActivities.map(a => a.id);
      const currentActivityIds = (day.activities || [])
        .filter(a => !a.id.startsWith('temp-'))
        .map(a => a.id);

      // Delete activities that are no longer in the data
      const activitiesToDelete = existingActivityIds.filter(id => !currentActivityIds.includes(id));
      if (activitiesToDelete.length > 0) {
        console.log(`[Save] Deleting ${activitiesToDelete.length} activities from day ${dayId}`);
        await db
          .delete(activities)
          .where(inArray(activities.id, activitiesToDelete));
      }

      // Process each activity
      for (const activity of day.activities || []) {
        let activityId = activity.id;

        if (activity.id.startsWith('temp-')) {
          // Create new activity
          const [newActivity] = await db.insert(activities).values({
            dayId: dayId,
            timeBlock: activity.timeBlock,
            description: activity.description,
            orderIndex: activity.orderIndex,
          }).returning();

          activityId = newActivity.id;
          newIdMap[activity.id] = activityId; // Track the new ID
          console.log('[Save] Created new activity:', activityId);
        } else {
          // Update existing activity
          await db
            .update(activities)
            .set({
              timeBlock: activity.timeBlock,
              description: activity.description,
              orderIndex: activity.orderIndex,
              updatedAt: new Date(),
            })
            .where(eq(activities.id, activity.id));
        }

        // 5. Handle gems for this activity
        const existingGems = await db
          .select()
          .from(gems)
          .where(eq(gems.activityId, activityId));

        const existingGemIds = existingGems.map(g => g.id);
        const currentGemIds = (activity.gems || [])
          .filter(g => !g.id.startsWith('temp-'))
          .map(g => g.id);

        // Delete gems that are no longer in the data
        const gemsToDelete = existingGemIds.filter(id => !currentGemIds.includes(id));
        if (gemsToDelete.length > 0) {
          console.log(`[Save] Deleting ${gemsToDelete.length} gems from activity ${activityId}`);
          await db
            .delete(gems)
            .where(inArray(gems.id, gemsToDelete));
        }

        // Process each gem
        for (const gem of activity.gems || []) {
          if (gem.id.startsWith('temp-')) {
            // Create new gem
            const [newGem] = await db.insert(gems).values({
              activityId: activityId,
              gemType: gem.gemType as 'hidden_gem' | 'tip' | 'warning',
              title: gem.title,
              description: gem.description,
            }).returning();
            
            newIdMap[gem.id] = newGem.id; // Track the new ID
            console.log('[Save] Created new gem');
          } else {
            // Update existing gem
            await db
              .update(gems)
              .set({
                title: gem.title,
                description: gem.description,
                updatedAt: new Date(),
              })
              .where(eq(gems.id, gem.id));
          }
        }
      }
    }

    const saveElapsed = performance.now() - saveStart;
    console.log(`[Save] Database save completed in ${saveElapsed.toFixed(2)}ms`);

    // CACHE INVALIDATION ONLY - No path revalidation
    console.log('[Cache] Invalidating cache for trip:', tripData.id);
    await TripCacheService.invalidate(tripData.id);
    await TripCacheService.invalidate(`dashboard:v2:${user.id}`);
    
    // Warm cache in background
    warmCacheAfterSave(tripData.id).catch(console.error);
    
    console.log('[Save] Complete - returning new IDs to client');
    
    // Return success with new ID mappings
    return { 
      success: true,
      newIds: newIdMap // Client can use this to update temp IDs
    };
  } catch (error) {
    console.error('[Save] Error:', error);
    throw error;
  }
}