// lib/cache/granular-cache-service.ts
// Granular caching system with component-level cache management

import { getKV, setKV } from '@/lib/cache/redisBridge';
import type { TripData, TripDay, Activity, Gem } from '@/app/editor/[id]/lib/types';

const CACHE_VERSION = 'v3';

// TTL Strategy
const TTL = {
  METADATA: 3600,      // 1 hour - rarely changes
  DAY: 1800,          // 30 minutes
  ACTIVITY: 1800,     // 30 minutes
  GEM: 1800,          // 30 minutes
  FULL_TRIP: 900,     // 15 minutes
  PREVIEW: 1800,      // 30 minutes
  STRUCTURE: 3600,    // 1 hour
  ACTIVE_EDIT: 300,   // 5 minutes for actively edited components
} as const;

// Cache key generators
const CacheKeys = {
  // Component keys
  metadata: (tripId: string) => `trip:meta:${CACHE_VERSION}:${tripId}`,
  day: (dayId: string) => `trip:day:${CACHE_VERSION}:${dayId}`,
  activity: (activityId: string) => `trip:activity:${CACHE_VERSION}:${activityId}`,
  gem: (gemId: string) => `trip:gem:${CACHE_VERSION}:${gemId}`,
  
  // Assembled views
  fullTrip: (tripId: string) => `trip:full:${CACHE_VERSION}:${tripId}`,
  preview: (tripId: string) => `trip:preview:${CACHE_VERSION}:${tripId}`,
  
  // Structure and metadata
  structure: (tripId: string) => `trip:structure:${CACHE_VERSION}:${tripId}`,
  stale: (tripId: string) => `trip:stale:${CACHE_VERSION}:${tripId}`,
  
  // Batch operation keys
  dayActivities: (dayId: string) => `trip:day:activities:${CACHE_VERSION}:${dayId}`,
  activityGems: (activityId: string) => `trip:activity:gems:${CACHE_VERSION}:${activityId}`,
};

// Types for cache entries
interface TripMetadata {
  id: string;
  creatorId: string;
  title: string;
  subtitle: string;
  description: string | null;
  destination: string;
  durationDays: number;
  priceCents: number;
  currency: string;
  status: string;
  season?: string | null;
  budgetRange?: string | null;
  tripStyle?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TripStructure {
  tripId: string;
  dayIds: string[];
  dayMap: Record<string, { activityIds: string[] }>;
  activityMap: Record<string, { gemIds: string[] }>;
  version: number;
  lastModified: string;
}

interface CacheEntry<T> {
  data: T;
  version: number;
  cachedAt: string;
  ttl: number;
}

export class GranularCacheService {
  // Performance metrics
  private static metrics = {
    hits: 0,
    misses: 0,
    writes: 0,
    invalidations: 0,
  };

  /**
   * Get metadata for a trip (lightweight)
   */
  static async getMetadata(tripId: string): Promise<TripMetadata | null> {
    try {
      const response = await getKV(CacheKeys.metadata(tripId));
      if (response.value) {
        this.metrics.hits++;
        return JSON.parse(response.value) as TripMetadata;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Error getting metadata:', error);
      return null;
    }
  }

  /**
   * Set metadata for a trip
   */
  static async setMetadata(tripId: string, metadata: TripMetadata): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.metadata(tripId),
        value: JSON.stringify(metadata),
        ttl_seconds: TTL.METADATA,
      });
      this.metrics.writes++;
    } catch (error) {
      console.error('[Cache] Error setting metadata:', error);
    }
  }

  /**
   * Get a single day's data
   */
  static async getDay(dayId: string): Promise<TripDay | null> {
    try {
      const response = await getKV(CacheKeys.day(dayId));
      if (response.value) {
        this.metrics.hits++;
        return JSON.parse(response.value) as TripDay;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Error getting day:', error);
      return null;
    }
  }

  /**
   * Set a single day's data
   */
  static async setDay(dayId: string, day: TripDay, isActiveEdit = false): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.day(dayId),
        value: JSON.stringify(day),
        ttl_seconds: isActiveEdit ? TTL.ACTIVE_EDIT : TTL.DAY,
      });
      this.metrics.writes++;
    } catch (error) {
      console.error('[Cache] Error setting day:', error);
    }
  }

  /**
   * Get a single activity
   */
  static async getActivity(activityId: string): Promise<Activity | null> {
    try {
      const response = await getKV(CacheKeys.activity(activityId));
      if (response.value) {
        this.metrics.hits++;
        return JSON.parse(response.value) as Activity;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Error getting activity:', error);
      return null;
    }
  }

  /**
   * Set a single activity
   */
  static async setActivity(activityId: string, activity: Activity, isActiveEdit = false): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.activity(activityId),
        value: JSON.stringify(activity),
        ttl_seconds: isActiveEdit ? TTL.ACTIVE_EDIT : TTL.ACTIVITY,
      });
      this.metrics.writes++;
    } catch (error) {
      console.error('[Cache] Error setting activity:', error);
    }
  }

  /**
   * Get trip structure (index of all components)
   */
  static async getStructure(tripId: string): Promise<TripStructure | null> {
    try {
      const response = await getKV(CacheKeys.structure(tripId));
      if (response.value) {
        this.metrics.hits++;
        return JSON.parse(response.value) as TripStructure;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Error getting structure:', error);
      return null;
    }
  }

  /**
   * Set trip structure
   */
  static async setStructure(tripId: string, structure: TripStructure): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.structure(tripId),
        value: JSON.stringify(structure),
        ttl_seconds: TTL.STRUCTURE,
      });
      this.metrics.writes++;
    } catch (error) {
      console.error('[Cache] Error setting structure:', error);
    }
  }

  /**
   * Get full trip (assembled view)
   */
  static async getFullTrip(tripId: string): Promise<TripData | null> {
    try {
      // Check if stale
      const staleCheck = await getKV(CacheKeys.stale(tripId));
      if (staleCheck.value === 'true') {
        console.log('[Cache] Full trip marked as stale, skipping');
        return null;
      }

      const response = await getKV(CacheKeys.fullTrip(tripId));
      if (response.value) {
        this.metrics.hits++;
        const data = JSON.parse(response.value) as TripData;
        // Ensure days array exists
        data.days = data.days || [];
        return data;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Error getting full trip:', error);
      return null;
    }
  }

  /**
   * Set full trip (assembled view)
   */
  static async setFullTrip(tripId: string, trip: TripData): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.fullTrip(tripId),
        value: JSON.stringify(trip),
        ttl_seconds: TTL.FULL_TRIP,
      });
      
      // Clear stale marker
      await setKV({
        key: CacheKeys.stale(tripId),
        value: 'false',
        ttl_seconds: TTL.FULL_TRIP,
      });
      
      this.metrics.writes++;
    } catch (error) {
      console.error('[Cache] Error setting full trip:', error);
    }
  }

  /**
   * Mark full trip as stale (needs rebuild)
   */
  static async markStale(tripId: string): Promise<void> {
    try {
      await setKV({
        key: CacheKeys.stale(tripId),
        value: 'true',
        ttl_seconds: TTL.FULL_TRIP,
      });
      this.metrics.invalidations++;
    } catch (error) {
      console.error('[Cache] Error marking stale:', error);
    }
  }

  /**
   * Batch get multiple days
   */
  static async getDays(dayIds: string[]): Promise<Map<string, TripDay>> {
    const results = new Map<string, TripDay>();
    
    const promises = dayIds.map(async (dayId) => {
      const day = await this.getDay(dayId);
      if (day) {
        results.set(dayId, day);
      }
    });
    
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Batch get multiple activities
   */
  static async getActivities(activityIds: string[]): Promise<Map<string, Activity>> {
    const results = new Map<string, Activity>();
    
    const promises = activityIds.map(async (activityId) => {
      const activity = await this.getActivity(activityId);
      if (activity) {
        results.set(activityId, activity);
      }
    });
    
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Invalidate component and mark full trip as stale
   */
  static async invalidateComponent(
    tripId: string,
    componentType: 'day' | 'activity' | 'gem',
    componentId: string
  ): Promise<void> {
    try {
      // Invalidate specific component
      let key: string;
      switch (componentType) {
        case 'day':
          key = CacheKeys.day(componentId);
          break;
        case 'activity':
          key = CacheKeys.activity(componentId);
          break;
        case 'gem':
          key = CacheKeys.gem(componentId);
          break;
      }
      
      await setKV({
        key,
        value: JSON.stringify({ invalidated: true }),
        ttl_seconds: 1, // Expire immediately
      });
      
      // Mark full trip as stale
      await this.markStale(tripId);
      
      this.metrics.invalidations++;
      console.log(`[Cache] Invalidated ${componentType} ${componentId} and marked trip ${tripId} as stale`);
    } catch (error) {
      console.error('[Cache] Error invalidating component:', error);
    }
  }

  /**
   * Smart save - only update changed components
   */
  static async smartSave(
    tripId: string,
    changes: {
      metadata?: Partial<TripMetadata>;
      days?: Map<string, TripDay>;
      activities?: Map<string, Activity>;
      gems?: Map<string, Gem>;
      structure?: TripStructure;
    }
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Update metadata if changed
    if (changes.metadata) {
      const existing = await this.getMetadata(tripId);
      if (existing) {
        const updated = { ...existing, ...changes.metadata };
        promises.push(this.setMetadata(tripId, updated));
      }
    }
    
    // Update changed days
    if (changes.days) {
      changes.days.forEach((day, dayId) => {
        promises.push(this.setDay(dayId, day, true));
      });
    }
    
    // Update changed activities
    if (changes.activities) {
      changes.activities.forEach((activity, activityId) => {
        promises.push(this.setActivity(activityId, activity, true));
      });
    }
    
    // Update structure if changed
    if (changes.structure) {
      promises.push(this.setStructure(tripId, changes.structure));
    }
    
    // Mark full trip as stale
    promises.push(this.markStale(tripId));
    
    await Promise.allSettled(promises);
    console.log(`[Cache] Smart save completed for trip ${tripId}`);
  }

  /**
   * Prefetch related components
   */
  static async prefetchDay(dayId: string, structure: TripStructure): Promise<void> {
    const activityIds = structure.dayMap[dayId]?.activityIds || [];
    
    // Parallel fetch day and its activities
    const promises = [
      this.getDay(dayId),
      ...activityIds.map(id => this.getActivity(id)),
    ];
    
    await Promise.allSettled(promises);
    console.log(`[Cache] Prefetched day ${dayId} with ${activityIds.length} activities`);
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2) + '%',
      total,
    };
  }

  /**
   * Clear all cache for a trip
   */
  static async clearTripCache(tripId: string): Promise<void> {
    const structure = await this.getStructure(tripId);
    
    if (structure) {
      const keys = [
        CacheKeys.metadata(tripId),
        CacheKeys.fullTrip(tripId),
        CacheKeys.preview(tripId),
        CacheKeys.structure(tripId),
        CacheKeys.stale(tripId),
        ...structure.dayIds.map(id => CacheKeys.day(id)),
        ...Object.keys(structure.activityMap).map(id => CacheKeys.activity(id)),
      ];
      
      // Invalidate all keys
      await Promise.allSettled(
        keys.map(key => setKV({
          key,
          value: JSON.stringify({ invalidated: true }),
          ttl_seconds: 1,
        }))
      );
      
      console.log(`[Cache] Cleared all cache for trip ${tripId}`);
    }
  }
}