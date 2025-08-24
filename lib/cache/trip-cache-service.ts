// lib/cache/trip-cache-service.ts
// Main cache service that delegates to granular cache

import { GranularCacheService } from './granular-cache-service';
import { loadTripGranular, loadTripMetadata, loadDayWithActivities } from './granular-trip-loader';
import type { TripData } from '@/app/editor/[id]/lib/types';

/**
 * Main function to get trip data with granular caching
 */
export async function getTripDataFast(
  tripId: string,
  options?: { 
    skipCache?: boolean;
    metadataOnly?: boolean;
    dayId?: string; // Load specific day only
  }
): Promise<TripData | null> {
  const requestId = Math.random().toString(36).substring(7);
  const totalStart = performance.now();
  
  console.log(`[PERF-${requestId}] Loading trip ${tripId}`);
  
  try {
    // Metadata only (for dashboard, listings)
    if (options?.metadataOnly) {
      const metadata = await loadTripMetadata(tripId);
      const elapsed = performance.now() - totalStart;
      console.log(`[PERF-${requestId}] Metadata loaded in ${elapsed.toFixed(2)}ms`);
      return metadata as any; // Type cast for compatibility
    }
    
    // Specific day only (for focused editing)
    if (options?.dayId) {
      const day = await loadDayWithActivities(options.dayId);
      const elapsed = performance.now() - totalStart;
      console.log(`[PERF-${requestId}] Day loaded in ${elapsed.toFixed(2)}ms`);
      // Return partial trip with just this day
      return { days: day ? [day] : [] } as any;
    }
    
    // Full trip load (uses granular cache)
    if (!options?.skipCache) {
      const data = await loadTripGranular(tripId);
      const elapsed = performance.now() - totalStart;
      console.log(`[PERF-${requestId}] Trip loaded in ${elapsed.toFixed(2)}ms`);
      
      // Log cache stats periodically
      if (Math.random() < 0.1) { // 10% of requests
        const stats = GranularCacheService.getStats();
        console.log('[Cache Stats]', stats);
      }
      
      return data;
    }
    
    // Skip cache (force DB load)
    console.log(`[PERF-${requestId}] Cache skipped, loading from DB`);
    const data = await loadTripGranular(tripId);
    const elapsed = performance.now() - totalStart;
    console.log(`[PERF-${requestId}] DB load completed in ${elapsed.toFixed(2)}ms`);
    
    return data;
  } catch (error) {
    console.error(`[PERF-${requestId}] Error loading trip:`, error);
    return null;
  }
}

/**
 * Invalidate trip cache (granular invalidation)
 */
export async function invalidateTripCache(tripId: string): Promise<void> {
  await GranularCacheService.clearTripCache(tripId);
}

/**
 * Warm cache after save (granular warming)
 */
export async function warmCacheAfterSave(tripId: string): Promise<void> {
  setTimeout(async () => {
    console.log(`[Cache WARM] Pre-loading trip ${tripId} after save`);
    // This will rebuild the cache from DB
    await loadTripGranular(tripId);
  }, 100);
}

/**
 * Prefetch day for hover (smart prefetching)
 */
export async function prefetchDay(dayId: string, tripId: string): Promise<void> {
  const structure = await GranularCacheService.getStructure(tripId);
  if (structure) {
    await GranularCacheService.prefetchDay(dayId, structure);
  }
}

/**
 * Dashboard optimization - load multiple trip metadata
 */
export async function getTripMetadataBatch(tripIds: string[]): Promise<Map<string, any>> {
  const results = new Map();
  
  // Parallel load all metadata
  const promises = tripIds.map(async (tripId) => {
    const metadata = await loadTripMetadata(tripId);
    if (metadata) {
      results.set(tripId, metadata);
    }
  });
  
  await Promise.allSettled(promises);
  return results;
}

// Re-export the service for backwards compatibility
export class TripCacheService {
  static async get(tripId: string): Promise<TripData | null> {
    return getTripDataFast(tripId);
  }
  
  static async set(tripId: string, data: TripData): Promise<void> {
    await GranularCacheService.setFullTrip(tripId, data);
  }
  
  static async invalidate(tripId: string): Promise<void> {
    await invalidateTripCache(tripId);
  }
  
  static async getDashboard(userId: string): Promise<any[] | null> {
    // This would be updated to use metadata batch loading
    return null;
  }
  
  static async cacheDashboard(userId: string, trips: any[]): Promise<void> {
    // Dashboard caching would be updated
  }
  
  static async warmUp(tripIds: string[]): Promise<void> {
    // Warm up metadata for all trips
    await getTripMetadataBatch(tripIds);
  }
  
  static getStats() {
    return GranularCacheService.getStats();
  }
}