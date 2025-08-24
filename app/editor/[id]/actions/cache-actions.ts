// app/editor/[id]/actions/cache-actions.ts
// Server actions for cache operations that can be called from client components

'use server';

import { getTripDataFast } from '@/lib/cache/trip-cache-service';
import { GranularCacheService } from '@/lib/cache/granular-cache-service';

/**
 * Prefetch a day's data for quick access
 * This runs on the server and can be called from client components
 */
export async function prefetchDayAction(dayId: string, tripId: string) {
  try {
    const structure = await GranularCacheService.getStructure(tripId);
    if (structure) {
      await GranularCacheService.prefetchDay(dayId, structure);
    }
    return { success: true };
  } catch (error) {
    console.error('[Prefetch] Error:', error);
    return { success: false };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  return GranularCacheService.getStats();
}