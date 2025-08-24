// app/preview/[id]/page.tsx
// Simplified preview page

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadTrip } from '@/lib/data/trip-loader-simple';
import TripViewer from './trip-viewer';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // Load trip data
  const tripData = await loadTrip(id);

  if (!tripData) {
    redirect('/');
  }

  // For preview, only the creator can view drafts
  if (tripData.status === 'draft' && (!user || tripData.creatorId !== user.id)) {
    redirect('/');
  }

  // Check if current user owns this trip (for edit button)
  const isOwner = !!(user && tripData.creatorId === user.id);
  
  // Check if user has purchased this trip (for future implementation)
  const hasPurchased = false; // Will implement with purchase system

  return (
    <TripViewer 
      trip={tripData as any} 
      isOwner={isOwner}
      hasPurchased={hasPurchased}
      isPreview={true}
    />
  );
}