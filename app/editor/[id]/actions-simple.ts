// app/editor/[id]/actions-simple.ts
// Simplified server actions for saving trip data

'use server';

import { db } from '@/db/client';
import { trips, tripDays, activities, gems } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { invalidateCache } from '@/lib/cache/simple-cache';
import { revalidatePath } from 'next/cache';
import type { TripData } from './types-simple';

export async function saveTrip(tripData: TripData) {
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
    const newIdMap: Record<string, string> = {};

    // Use a transaction for consistency
    await db.transaction(async (tx) => {
      // 1. Update trip metadata
      await tx
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

      // 2. Get existing days
      const existingDays = await tx
        .select()
        .from(tripDays)
        .where(eq(tripDays.tripId, tripData.id));

      const existingDayIds = existingDays.map(d => d.id);
      const currentDayIds = tripData.days
        .filter(d => !d.id.startsWith('temp-'))
        .map(d => d.id);

      // Delete removed days
      const daysToDelete = existingDayIds.filter(id => !currentDayIds.includes(id));
      if (daysToDelete.length > 0) {
        await tx
          .delete(tripDays)
          .where(inArray(tripDays.id, daysToDelete));
      }

      // 3. Process each day
      for (const day of tripData.days) {
        let dayId = day.id;

        if (day.id.startsWith('temp-')) {
          // Create new day
          const [newDay] = await tx.insert(tripDays).values({
            tripId: tripData.id,
            dayNumber: day.dayNumber,
            title: day.title,
            subtitle: day.subtitle,
          }).returning();
          
          dayId = newDay.id;
          newIdMap[day.id] = dayId;
        } else {
          // Update existing day
          await tx
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
        const existingActivities = await tx
          .select()
          .from(activities)
          .where(eq(activities.dayId, dayId));

        const existingActivityIds = existingActivities.map(a => a.id);
        const currentActivityIds = (day.activities || [])
          .filter(a => !a.id.startsWith('temp-'))
          .map(a => a.id);

        // Delete removed activities
        const activitiesToDelete = existingActivityIds.filter(id => !currentActivityIds.includes(id));
        if (activitiesToDelete.length > 0) {
          await tx
            .delete(activities)
            .where(inArray(activities.id, activitiesToDelete));
        }

        // Process each activity
        for (const activity of day.activities || []) {
          let activityId = activity.id;

          if (activity.id.startsWith('temp-')) {
            // Create new activity
            const [newActivity] = await tx.insert(activities).values({
              dayId: dayId,
              timeBlock: activity.timeBlock,
              description: activity.description,
              orderIndex: activity.orderIndex,
            }).returning();

            activityId = newActivity.id;
            newIdMap[activity.id] = activityId;
          } else {
            // Update existing activity
            await tx
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
          const existingGems = await tx
            .select()
            .from(gems)
            .where(eq(gems.activityId, activityId));

          const existingGemIds = existingGems.map(g => g.id);
          const currentGemIds = (activity.gems || [])
            .filter(g => !g.id.startsWith('temp-'))
            .map(g => g.id);

          // Delete removed gems
          const gemsToDelete = existingGemIds.filter(id => !currentGemIds.includes(id));
          if (gemsToDelete.length > 0) {
            await tx
              .delete(gems)
              .where(inArray(gems.id, gemsToDelete));
          }

          // Process each gem
          for (const gem of activity.gems || []) {
            if (gem.id.startsWith('temp-')) {
              // Create new gem
              const [newGem] = await tx.insert(gems).values({
                activityId: activityId,
                gemType: gem.gemType as 'hidden_gem' | 'tip' | 'warning',
                title: gem.title,
                description: gem.description,
                insiderInfo: gem.insiderInfo,
              }).returning();
              
              newIdMap[gem.id] = newGem.id;
            } else {
              // Update existing gem
              await tx
                .update(gems)
                .set({
                  title: gem.title,
                  description: gem.description,
                  insiderInfo: gem.insiderInfo,
                  updatedAt: new Date(),
                })
                .where(eq(gems.id, gem.id));
            }
          }
        }
      }
    });

    // Invalidate cache
    await invalidateCache(`trip:${tripData.id}`);
    
    console.log('[Save] Complete');
    
    return { 
      success: true,
      newIds: Object.keys(newIdMap).length > 0 ? newIdMap : undefined
    };
  } catch (error) {
    console.error('[Save] Error:', error);
    throw error;
  }
}

export async function publishTrip(tripId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip || trip.creatorId !== user.id) {
    throw new Error('Unauthorized');
  }

  await db
    .update(trips)
    .set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(trips.id, tripId));

  // Invalidate cache
  await invalidateCache(`trip:${tripId}`);
  
  // Revalidate pages
  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/dashboard');
  
  return { success: true };
}

export async function deleteTrip(tripId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip || trip.creatorId !== user.id) {
    throw new Error('Unauthorized');
  }

  await db
    .delete(trips)
    .where(eq(trips.id, tripId));

  // Invalidate cache
  await invalidateCache(`trip:${tripId}`);
  
  revalidatePath('/dashboard');
  
  return { success: true };
}