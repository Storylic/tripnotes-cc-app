// lib/cache/simple-cache.ts
// Simplified single-layer Redis cache

import { getKV, setKV } from './redisBridge';
import type { TripData } from '@/app/editor/[id]/types-simple';

const CACHE_TTL = 900; // 15 minutes
const CACHE_VERSION = 'v1';

/**
 * Get cached trip data
 */
export async function getCachedTrip(tripId: string): Promise<TripData | null> {
  try {
    const key = `trip:${CACHE_VERSION}:${tripId}`;
    const response = await getKV(key);
    
    if (response.value) {
      console.log(`[Cache] Hit for trip ${tripId}`);
      return JSON.parse(response.value) as TripData;
    }
    
    console.log(`[Cache] Miss for trip ${tripId}`);
    return null;
  } catch (error) {
    console.error('[Cache] Error getting trip:', error);
    return null; // Fail gracefully
  }
}

/**
 * Cache trip data
 */
export async function cacheTrip(tripId: string, data: TripData): Promise<void> {
  try {
    const key = `trip:${CACHE_VERSION}:${tripId}`;
    await setKV({
      key,
      value: JSON.stringify(data),
      ttl_seconds: CACHE_TTL,
    });
    console.log(`[Cache] Stored trip ${tripId}`);
  } catch (error) {
    console.error('[Cache] Error caching trip:', error);
    // Cache write failures are non-critical
  }
}

/**
 * Invalidate cached trip
 */
export async function invalidateCache(tripId: string): Promise<void> {
  try {
    const key = `trip:${CACHE_VERSION}:${tripId}`;
    // Set with 1 second TTL to effectively delete
    await setKV({
      key,
      value: JSON.stringify({ invalidated: true }),
      ttl_seconds: 1,
    });
    console.log(`[Cache] Invalidated trip ${tripId}`);
  } catch (error) {
    console.error('[Cache] Error invalidating:', error);
    // Invalidation failures are non-critical
  }
}

/**
 * Cache dashboard data
 */
export async function cacheDashboard(userId: string, trips: any[]): Promise<void> {
  try {
    const key = `dashboard:${CACHE_VERSION}:${userId}`;
    await setKV({
      key,
      value: JSON.stringify(trips),
      ttl_seconds: 300, // 5 minutes for dashboard
    });
  } catch (error) {
    console.error('[Cache] Error caching dashboard:', error);
  }
}

/**
 * Get cached dashboard
 */
export async function getCachedDashboard(userId: string): Promise<any[] | null> {
  try {
    const key = `dashboard:${CACHE_VERSION}:${userId}`;
    const response = await getKV(key);
    
    if (response.value) {
      return JSON.parse(response.value);
    }
    
    return null;
  } catch (error) {
    console.error('[Cache] Error getting dashboard:', error);
    return null;
  }
}

/**
 * Batch invalidate (for cleanup)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    // Invalidate dashboard
    await invalidateCache(`dashboard:${CACHE_VERSION}:${userId}`);
    console.log(`[Cache] Invalidated user cache for ${userId}`);
  } catch (error) {
    console.error('[Cache] Error invalidating user cache:', error);
  }
}