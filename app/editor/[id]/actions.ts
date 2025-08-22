// app/editor/[id]/actions.ts
// Server actions for saving trip data with proper deletion handling

'use server';

import { db } from '@/db/client';
import { trips, tripDays, activities, gems } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

export async function saveTrip(tripData: SaveTripData) {
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
    console.log('Saving trip:', tripData.id);
    console.log('Days to save:', tripData.days.length);
    console.log('Total activities:', tripData.days.reduce((sum, day) => sum + (day.activities?.length || 0), 0));

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
      console.log('Deleting days:', daysToDelete);
      // Activities and gems will cascade delete
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
        console.log('Created new day:', dayId);
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
      // Get ALL existing activities for this specific day
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
        console.log(`Deleting ${activitiesToDelete.length} activities from day ${dayId}`);
        // Gems will cascade delete
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
          console.log('Created new activity:', activityId);
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
        // Get ALL existing gems for this specific activity
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
          console.log(`Deleting ${gemsToDelete.length} gems from activity ${activityId}`);
          await db
            .delete(gems)
            .where(inArray(gems.id, gemsToDelete));
        }

        // Process each gem
        for (const gem of activity.gems || []) {
          if (gem.id.startsWith('temp-')) {
            // Create new gem
            await db.insert(gems).values({
              activityId: activityId,
              gemType: gem.gemType as 'hidden_gem' | 'tip' | 'warning',
              title: gem.title,
              description: gem.description,
            });
            console.log('Created new gem');
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

    // Force revalidation of both editor and preview pages
    revalidatePath(`/editor/${tripData.id}`);
    revalidatePath(`/preview/${tripData.id}`);
    revalidatePath(`/trips/${tripData.id}`);
    
    console.log('Save completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Save error:', error);
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

  // Revalidate all relevant paths
  revalidatePath(`/editor/${tripId}`);
  revalidatePath(`/preview/${tripId}`);
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

  revalidatePath('/dashboard');
  
  return { success: true };
}