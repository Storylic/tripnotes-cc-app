// app/editor/[id]/page.tsx
// Editor page using granular caching system

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips } from '@/db/schema';
import { getTripDataFast } from '@/lib/cache/trip-cache-service'; // Uses granular cache internally
import GranularEditorClient from './editor-client-granular';
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

  // Load trip data using granular cache system
  const loadStart = performance.now();
  const tripData = await getTripDataFast(id); // This now uses granular caching
  const loadTime = performance.now() - loadStart;
  
  console.log(`[Editor] Trip ${id} loaded in ${loadTime.toFixed(2)}ms`);

  if (!tripData) {
    redirect('/dashboard');
  }

  // Verify ownership
  if (tripData.creatorId !== user.id) {
    redirect('/dashboard');
  }

  // Ensure days array exists before passing to client
  const sanitizedTripData: TripData = {
    ...tripData,
    days: Array.isArray(tripData.days) ? tripData.days : [],
  };

  // Use the granular editor client
  return <GranularEditorClient initialData={sanitizedTripData} />;
}