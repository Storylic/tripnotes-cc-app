// app/editor/[id]/page.tsx
// Simplified editor page

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips } from '@/db/schema';
import { loadTrip } from '@/lib/data/trip-loader-simple';
import SimplifiedEditorClient from './editor-client-simple';

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

  // Load trip data
  const tripData = await loadTrip(id);

  if (!tripData) {
    redirect('/dashboard');
  }

  // Verify ownership
  if (tripData.creatorId !== user.id) {
    redirect('/dashboard');
  }

  // Ensure days array exists
  if (!tripData.days) {
    tripData.days = [];
  }

  return <SimplifiedEditorClient initialData={tripData} />;
}