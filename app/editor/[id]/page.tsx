// app/editor/[id]/page.tsx
// Main trip editor page with two-panel layout

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips, tripDays, activities, gems } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import EditorClient from './editor-client';
import type { TripData } from './lib/types';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/editor/${id}`);
  }

  // Handle new trip creation
  if (id === 'new') {
    // Create a new trip and redirect to its editor
    const [newTrip] = await db.insert(trips).values({
      creatorId: user.id,
      title: 'Untitled Trip',
      subtitle: 'Add duration, season, and budget',
      description: '',
      destination: '',
      durationDays: 5,
      priceCents: 1500, // $15 default
      currency: 'USD',
      status: 'draft',
    }).returning();

    redirect(`/editor/${newTrip.id}`);
  }

  // Load existing trip
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, id))
    .limit(1);

  if (!trip) {
    redirect('/dashboard');
  }

  // Verify ownership
  if (trip.creatorId !== user.id) {
    redirect('/dashboard');
  }

  // Load trip days with activities and gems
  const days = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, id))
    .orderBy(tripDays.dayNumber);

  // Load all activities for this trip's days
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
  const tripData: TripData = {
    ...trip,
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

  return <EditorClient initialData={tripData} />;
}