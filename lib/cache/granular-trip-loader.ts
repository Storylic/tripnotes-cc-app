// lib/cache/granular-trip-loader.ts
// Optimized trip loader that uses granular caching

import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { GranularCacheService } from './granular-cache-service';
import type { TripData, TripDay, Activity } from '@/app/editor/[id]/lib/types';

/**
 * Load trip data using granular cache strategy
 */
export async function loadTripGranular(tripId: string): Promise<TripData | null> {
  const startTime = performance.now();
  
  try {
    // 1. Try to get full assembled trip first (fastest path)
    const fullTrip = await GranularCacheService.getFullTrip(tripId);
    if (fullTrip) {
      const elapsed = performance.now() - startTime;
      console.log(`[Loader] Full trip loaded from cache in ${elapsed.toFixed(2)}ms`);
      return fullTrip;
    }
    
    // 2. Try to assemble from granular cache
    const assembled = await assembleFromCache(tripId);
    if (assembled) {
      const elapsed = performance.now() - startTime;
      console.log(`[Loader] Trip assembled from granular cache in ${elapsed.toFixed(2)}ms`);
      
      // Cache the assembled version for next time
      await GranularCacheService.setFullTrip(tripId, assembled);
      
      return assembled;
    }
    
    // 3. Fall back to database and populate cache
    console.log(`[Loader] Cache miss, loading from database`);
    const dbTrip = await loadFromDatabase(tripId);
    
    if (dbTrip) {
      const elapsed = performance.now() - startTime;
      console.log(`[Loader] Trip loaded from DB in ${elapsed.toFixed(2)}ms`);
      
      // Populate granular cache in background
      populateGranularCache(dbTrip).catch(console.error);
      
      return dbTrip;
    }
    
    return null;
  } catch (error) {
    console.error('[Loader] Error loading trip:', error);
    return null;
  }
}

/**
 * Try to assemble trip from granular cache components
 */
async function assembleFromCache(tripId: string): Promise<TripData | null> {
  try {
    // Get structure and metadata in parallel
    const [structure, metadata] = await Promise.all([
      GranularCacheService.getStructure(tripId),
      GranularCacheService.getMetadata(tripId),
    ]);
    
    if (!structure || !metadata) {
      console.log('[Loader] Missing structure or metadata in cache');
      return null;
    }
    
    // Parallel fetch all days
    const dayMap = await GranularCacheService.getDays(structure.dayIds);
    
    // Check if we got all days
    if (dayMap.size !== structure.dayIds.length) {
      console.log(`[Loader] Only ${dayMap.size}/${structure.dayIds.length} days in cache`);
      return null;
    }
    
    // Get all activity IDs
    const allActivityIds = Object.keys(structure.activityMap);
    
    // Parallel fetch all activities
    const activityMap = await GranularCacheService.getActivities(allActivityIds);
    
    // Assemble the complete trip
    const days: TripDay[] = structure.dayIds.map(dayId => {
      const day = dayMap.get(dayId);
      if (!day) return null;
      
      // Attach activities to day
      const dayActivityIds = structure.dayMap[dayId]?.activityIds || [];
      const activities: Activity[] = dayActivityIds
        .map(actId => activityMap.get(actId))
        .filter((a): a is Activity => a !== undefined);
      
      return {
        ...day,
        activities,
      };
    }).filter((d): d is TripDay => d !== null);
    
    // Combine everything
    const tripData: TripData = {
      ...metadata,
      days,
    };
    
    return tripData;
  } catch (error) {
    console.error('[Loader] Error assembling from cache:', error);
    return null;
  }
}

/**
 * Load from database with optimized query
 */
async function loadFromDatabase(tripId: string): Promise<TripData | null> {
  const result = await db.execute(sql`
    WITH trip_data AS (
      SELECT 
        t.*,
        u.name as creator_name,
        u.email as creator_email,
        (
          SELECT json_agg(
            json_build_object(
              'id', td.id,
              'tripId', td.trip_id,
              'dayNumber', td.day_number,
              'title', td.title,
              'subtitle', td.subtitle,
              'summary', td.summary,
              'createdAt', td.created_at,
              'updatedAt', td.updated_at,
              'activities', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', a.id,
                    'dayId', a.day_id,
                    'timeBlock', a.time_block,
                    'description', a.description,
                    'orderIndex', a.order_index,
                    'locationName', a.location_name,
                    'locationLat', a.location_lat,
                    'locationLng', a.location_lng,
                    'activityType', a.activity_type,
                    'estimatedCost', a.estimated_cost,
                    'startTime', a.start_time,
                    'endTime', a.end_time,
                    'title', a.title,
                    'gems', (
                      SELECT COALESCE(json_agg(
                        json_build_object(
                          'id', g.id,
                          'title', g.title,
                          'description', g.description,
                          'gemType', g.gem_type,
                          'insiderInfo', g.insider_info,
                          'metadata', g.metadata
                        ) ORDER BY g.created_at
                      ), '[]'::json)
                      FROM gems g
                      WHERE g.activity_id = a.id
                    )
                  ) ORDER BY a.order_index
                ), '[]'::json)
                FROM activities a
                WHERE a.day_id = td.id
              )
            ) ORDER BY td.day_number
          )
        ) as days
      FROM trips t
      LEFT JOIN users u ON u.id = t.creator_id
      LEFT JOIN trip_days td ON td.trip_id = t.id
      WHERE t.id = ${tripId}
      GROUP BY t.id, u.id, u.name, u.email
    )
    SELECT * FROM trip_data
  `);

  if (!result || result.length === 0) {
    return null;
  }

  const row = result[0] as any;
  const days = row.days || [];
  
  const tripData: TripData = {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    destination: row.destination,
    durationDays: row.duration_days,
    priceCents: row.price_cents,
    currency: row.currency,
    status: row.status,
    season: row.season,
    budgetRange: row.budget_range,
    tripStyle: row.trip_style,
    coverImageUrl: row.cover_image_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    days: Array.isArray(days) ? days : [],
  };

  return tripData;
}

/**
 * Populate granular cache from trip data
 */
async function populateGranularCache(trip: TripData): Promise<void> {
  try {
    const promises: Promise<void>[] = [];
    
    // 1. Cache metadata
    const metadata = {
      id: trip.id,
      creatorId: trip.creatorId,
      title: trip.title,
      subtitle: trip.subtitle,
      description: trip.description,
      destination: trip.destination,
      durationDays: trip.durationDays,
      priceCents: trip.priceCents,
      currency: trip.currency,
      status: trip.status,
      season: trip.season,
      budgetRange: trip.budgetRange,
      tripStyle: trip.tripStyle,
      coverImageUrl: trip.coverImageUrl,
      publishedAt: trip.publishedAt,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
    promises.push(GranularCacheService.setMetadata(trip.id, metadata));
    
    // 2. Build structure
    const structure = {
      tripId: trip.id,
      dayIds: trip.days.map(d => d.id),
      dayMap: {} as Record<string, { activityIds: string[] }>,
      activityMap: {} as Record<string, { gemIds: string[] }>,
      version: 1,
      lastModified: new Date().toISOString(),
    };
    
    // 3. Cache each day and activity
    trip.days.forEach(day => {
      // Cache day
      promises.push(GranularCacheService.setDay(day.id, day));
      
      // Build day map
      structure.dayMap[day.id] = {
        activityIds: day.activities.map(a => a.id),
      };
      
      // Cache activities
      day.activities.forEach(activity => {
        promises.push(GranularCacheService.setActivity(activity.id, activity));
        
        // Build activity map
        structure.activityMap[activity.id] = {
          gemIds: activity.gems.map(g => g.id),
        };
      });
    });
    
    // 4. Cache structure
    promises.push(GranularCacheService.setStructure(trip.id, structure));
    
    // 5. Cache full trip
    promises.push(GranularCacheService.setFullTrip(trip.id, trip));
    
    await Promise.allSettled(promises);
    console.log(`[Loader] Populated granular cache for trip ${trip.id}`);
  } catch (error) {
    console.error('[Loader] Error populating cache:', error);
  }
}

/**
 * Load just metadata (lightweight)
 */
export async function loadTripMetadata(tripId: string) {
  // Try cache first
  const cached = await GranularCacheService.getMetadata(tripId);
  if (cached) {
    return cached;
  }
  
  // Load from DB
  const result = await db.execute(sql`
    SELECT 
      t.*,
      u.name as creator_name,
      u.email as creator_email
    FROM trips t
    LEFT JOIN users u ON u.id = t.creator_id
    WHERE t.id = ${tripId}
  `);
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const row = result[0] as any;
  
  const metadata = {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    destination: row.destination,
    durationDays: row.duration_days,
    priceCents: row.price_cents,
    currency: row.currency,
    status: row.status,
    season: row.season,
    budgetRange: row.budget_range,
    tripStyle: row.trip_style,
    coverImageUrl: row.cover_image_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  
  // Cache for next time
  await GranularCacheService.setMetadata(tripId, metadata);
  
  return metadata;
}

/**
 * Load single day with activities (for editing)
 */
export async function loadDayWithActivities(dayId: string): Promise<TripDay | null> {
  // Try cache first
  const cached = await GranularCacheService.getDay(dayId);
  if (cached) {
    return cached;
  }
  
  // Load from DB
  const result = await db.execute(sql`
    SELECT 
      td.*,
      (
        SELECT json_agg(
          json_build_object(
            'id', a.id,
            'dayId', a.day_id,
            'timeBlock', a.time_block,
            'description', a.description,
            'orderIndex', a.order_index,
            'gems', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', g.id,
                  'title', g.title,
                  'description', g.description,
                  'gemType', g.gem_type
                )
              ), '[]'::json)
              FROM gems g
              WHERE g.activity_id = a.id
            )
          ) ORDER BY a.order_index
        )
        FROM activities a
        WHERE a.day_id = td.id
      ) as activities
    FROM trip_days td
    WHERE td.id = ${dayId}
  `);
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const row = result[0] as any;
  
  const day: TripDay = {
    id: row.id,
    tripId: row.trip_id,
    dayNumber: row.day_number,
    title: row.title,
    subtitle: row.subtitle,
    activities: row.activities || [],
  };
  
  // Cache for next time
  await GranularCacheService.setDay(dayId, day);
  
  return day;
}