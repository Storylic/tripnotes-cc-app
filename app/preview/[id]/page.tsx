// app/preview/[id]/page.tsx
// Preview page showing how the trip will look to end users

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips, tripDays, activities, gems, users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import TripViewer from './trip-viewer';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check if user is authenticated
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

  // For preview, only the creator can view drafts
  if (trip.status === 'draft' && (!user || trip.creatorId !== user.id)) {
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

  // Organize data
  const tripData = {
    ...trip,
    creator,
    days: days.map(day => ({
      ...day,
      activities: allActivities
        .filter(a => a.dayId === day.id)
        .map(activity => ({
          ...activity,
          gems: allGems.filter(g => g.activityId === activity.id),
        })),
    })),
  };

  // Check if current user owns this trip (for edit button)
  const isOwner = !!(user && trip.creatorId === user.id);
  
  // Check if user has purchased this trip (for future implementation)
  const hasPurchased = false; // Will implement with purchase system

  return (
    <TripViewer 
      trip={tripData} 
      isOwner={isOwner}
      hasPurchased={hasPurchased}
      isPreview={true}
    />
  );
}