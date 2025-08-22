// app/trips/[id]/page.tsx
// Public trip view page (for published trips)

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips, tripDays, activities, gems, users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import TripViewer from '../../preview/[id]/trip-viewer';

interface TripPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check if user is authenticated (optional for public view)
  const { data: { user } } = await supabase.auth.getUser();
  
  // Load trip
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    redirect('/');
  }

  // Only show published trips publicly (unless it's the owner)
  if (trip.status !== 'published' && (!user || trip.creatorId !== user.id)) {
    redirect('/');
  }

  // Load creator info
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, trip.creatorId))
    .limit(1);

  // Load trip days with activities and gems
  const days = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, id))
    .orderBy(tripDays.dayNumber);

  // Load all activities
  const dayIds = days.map(d => d.id);
  const allActivities = dayIds.length > 0 
    ? await db
        .select()
        .from(activities)
        .where(inArray(activities.dayId, dayIds))
        .orderBy(activities.orderIndex)
    : [];

  // Load all gems
  const activityIds = allActivities.map(a => a.id);
  const allGems = activityIds.length > 0
    ? await db
        .select()
        .from(gems)
        .where(inArray(gems.activityId, activityIds))
    : [];

  // Organize data with proper type casting
  const tripData = {
    ...trip,
    creator,
    days: days.map(day => ({
      ...day,
      tripId: trip.id,
      activities: allActivities
        .filter(a => a.dayId === day.id)
        .map(activity => ({
          id: activity.id,
          dayId: activity.dayId,
          timeBlock: activity.timeBlock,
          description: activity.description,
          orderIndex: activity.orderIndex,
          locationName: activity.locationName,
          locationLat: activity.locationLat ? String(activity.locationLat) : null,
          locationLng: activity.locationLng ? String(activity.locationLng) : null,
          activityType: activity.activityType,
          estimatedCost: activity.estimatedCost,
          startTime: activity.startTime,
          endTime: activity.endTime,
          title: activity.title,
          gems: allGems
            .filter(g => g.activityId === activity.id)
            .map(gem => ({
              id: gem.id,
              title: gem.title,
              description: gem.description,
              gemType: gem.gemType as 'hidden_gem' | 'tip' | 'warning',
              insiderInfo: gem.insiderInfo,
              metadata: gem.metadata,
            })),
        })),
    })),
  };

  // Check if current user owns this trip
  const isOwner = !!(user && trip.creatorId === user.id);
  
  // TODO: Check if user has purchased this trip
  const hasPurchased = false; // Will implement with purchase system

  return (
    <TripViewer 
      trip={tripData} 
      isOwner={isOwner}
      hasPurchased={hasPurchased}
      isPreview={false} // This is the public view, not preview
    />
  );
}