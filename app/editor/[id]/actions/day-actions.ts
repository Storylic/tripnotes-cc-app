// app/editor/[id]/actions/day-actions.ts
// Server actions for day operations

'use server';

import { db } from '@/db/client';
import { tripDays, activities, gems } from '@/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteDay(tripId: string, dayId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Delete the day (activities and gems will cascade delete)
  await db.delete(tripDays).where(eq(tripDays.id, dayId));

  // Renumber remaining days
  const remainingDays = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, tripId))
    .orderBy(tripDays.dayNumber);

  for (let i = 0; i < remainingDays.length; i++) {
    if (remainingDays[i].dayNumber !== i + 1) {
      await db
        .update(tripDays)
        .set({ dayNumber: i + 1 })
        .where(eq(tripDays.id, remainingDays[i].id));
    }
  }

  revalidatePath(`/editor/${tripId}`);
  return { success: true };
}

export async function duplicateDay(tripId: string, dayId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get the day to duplicate
  const [dayToDuplicate] = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.id, dayId))
    .limit(1);

  if (!dayToDuplicate) throw new Error('Day not found');

  // Get all activities and gems for this day
  const dayActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.dayId, dayId))
    .orderBy(activities.orderIndex);

  const activityIds = dayActivities.map(a => a.id);
  const dayGems = activityIds.length > 0
    ? await db
        .select()
        .from(gems)
        .where(inArray(gems.activityId, activityIds))
    : [];

  // Shift day numbers for days after the insertion point
  const daysToShift = await db
    .select()
    .from(tripDays)
    .where(
      and(
        eq(tripDays.tripId, tripId),
        gte(tripDays.dayNumber, dayToDuplicate.dayNumber + 1)
      )
    );

  for (const day of daysToShift) {
    await db
      .update(tripDays)
      .set({ dayNumber: day.dayNumber + 1 })
      .where(eq(tripDays.id, day.id));
  }

  // Create the duplicate day
  const [newDay] = await db.insert(tripDays).values({
    tripId,
    dayNumber: dayToDuplicate.dayNumber + 1,
    title: `${dayToDuplicate.title} (Copy)`,
    subtitle: dayToDuplicate.subtitle,
    summary: dayToDuplicate.summary,
  }).returning();

  // Duplicate activities and gems
  for (const activity of dayActivities) {
    const [newActivity] = await db.insert(activities).values({
      dayId: newDay.id,
      timeBlock: activity.timeBlock,
      startTime: activity.startTime,
      endTime: activity.endTime,
      title: activity.title,
      description: activity.description,
      locationName: activity.locationName,
      locationLat: activity.locationLat,
      locationLng: activity.locationLng,
      activityType: activity.activityType,
      estimatedCost: activity.estimatedCost,
      orderIndex: activity.orderIndex,
    }).returning();

    // Duplicate gems for this activity
    const activityGems = dayGems.filter(g => g.activityId === activity.id);
    for (const gem of activityGems) {
      await db.insert(gems).values({
        activityId: newActivity.id,
        gemType: gem.gemType,
        title: gem.title,
        description: gem.description,
        insiderInfo: gem.insiderInfo,
        metadata: gem.metadata,
      });
    }
  }

  revalidatePath(`/editor/${tripId}`);
  return { success: true, newDayId: newDay.id };
}

export async function reorderDays(tripId: string, dayIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update day numbers based on new order
  for (let i = 0; i < dayIds.length; i++) {
    await db
      .update(tripDays)
      .set({ 
        dayNumber: i + 1,
        updatedAt: new Date(),
      })
      .where(eq(tripDays.id, dayIds[i]));
  }

  revalidatePath(`/editor/${tripId}`);
  return { success: true };
}