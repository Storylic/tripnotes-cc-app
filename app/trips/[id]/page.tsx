// app/trips/[id]/page.tsx
// Simplified public trip view page

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadTrip } from '@/lib/data/trip-loader-simple';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
  const tripData = await loadTrip(id);

  if (!tripData) {
    redirect('/');
  }

  // Only show published trips publicly (unless it's the owner)
  if (tripData.status !== 'published' && (!user || tripData.creatorId !== user.id)) {
    redirect('/');
  }

  // Load creator info if needed
  const [creator] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, tripData.creatorId))
    .limit(1);

  // Add creator to trip data
  const tripWithCreator = {
    ...tripData,
    creator,
  };

  // Check if current user owns this trip
  const isOwner = !!(user && tripData.creatorId === user.id);
  
  // TODO: Check if user has purchased this trip
  const hasPurchased = false; // Will implement with purchase system

  return (
    <TripViewer 
      trip={tripWithCreator} 
      isOwner={isOwner}
      hasPurchased={hasPurchased}
      isPreview={false}
    />
  );
}