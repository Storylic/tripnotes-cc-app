// app/dashboard/actions.ts
// Server actions for dashboard operations

'use server';

import { getTripDataFast } from '@/lib/cache/trip-cache-service';

/**
 * Prefetch trip data for instant navigation
 * This is a server action that can be called from client components
 */
export async function prefetchTrip(tripId: string) {
  try {
    // This runs on the server, so it can access the database
    await getTripDataFast(tripId, { metadataOnly: true });
    return { success: true };
  } catch (error) {
    console.error('Prefetch error:', error);
    return { success: false };
  }
}