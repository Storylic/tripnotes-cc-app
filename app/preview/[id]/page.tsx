// app/preview/[id]/page.tsx
// Preview page with fixed performance logging

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTripDataFast } from '@/lib/cache/trip-cache-service';
import TripViewer from './trip-viewer';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // Load trip with caching - Use performance.now() instead of console.time
  const loadStart = performance.now();
  const tripData = await getTripDataFast(id);
  const loadTime = performance.now() - loadStart;
  
  // Log with timestamp to avoid conflicts
  console.log(`[Preview] Trip ${id} loaded in ${loadTime.toFixed(2)}ms at ${new Date().toISOString()}`);

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