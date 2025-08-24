// lib/data/trip-loader-simple.ts
// Simplified trip loader with single optimized query

import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getCachedTrip, cacheTrip } from '@/lib/cache/simple-cache';
import type { TripData } from '@/app/editor/[id]/types-simple';

/**
 * Load trip data with caching
 */
export async function loadTrip(tripId: string, skipCache = false): Promise<TripData | null> {
  // Try cache first (unless skipped)
  if (!skipCache) {
    const cached = await getCachedTrip(tripId);
    if (cached) {
      return cached;
    }
  }

  // Load from database with single optimized query
  const startTime = performance.now();
  
  try {
    const result = await db.execute(sql`
      WITH trip_data AS (
        SELECT 
          t.*,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', td.id,
                'tripId', td.trip_id,
                'dayNumber', td.day_number,
                'title', td.title,
                'subtitle', td.subtitle,
                'activities', (
                  SELECT COALESCE(json_agg(
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
                            'gemType', g.gem_type,
                            'insiderInfo', g.insider_info
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
            ), '[]'::json) as days
          FROM trip_days td
          WHERE td.trip_id = t.id
        )
        FROM trips t
        WHERE t.id = ${tripId}
      )
      SELECT * FROM trip_data
    `);

    const elapsed = performance.now() - startTime;
    console.log(`[DB] Trip ${tripId} loaded in ${elapsed.toFixed(2)}ms`);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0] as any;
    
    // Transform to TripData type
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
      days: Array.isArray(row.days) ? row.days : [],
    };

    // Cache for next time
    if (!skipCache) {
      await cacheTrip(tripId, tripData);
    }

    return tripData;
  } catch (error) {
    console.error('[DB] Error loading trip:', error);
    return null;
  }
}

/**
 * Load trips for dashboard (lightweight)
 */
export async function loadDashboardTrips(userId: string) {
  const startTime = performance.now();
  
  try {
    const result = await db.execute(sql`
      SELECT 
        t.id,
        t.title,
        t.subtitle,
        t.destination,
        t.duration_days,
        t.price_cents,
        t.status,
        t.cover_image_url,
        t.updated_at,
        (SELECT COUNT(*) FROM trip_days WHERE trip_id = t.id) as day_count,
        (SELECT COUNT(*) 
         FROM activities a 
         JOIN trip_days td ON a.day_id = td.id 
         WHERE td.trip_id = t.id) as activity_count
      FROM trips t
      WHERE t.creator_id = ${userId}
      ORDER BY t.updated_at DESC
    `);

    const elapsed = performance.now() - startTime;
    console.log(`[DB] Dashboard loaded in ${elapsed.toFixed(2)}ms`);

    return result as any[];
  } catch (error) {
    console.error('[DB] Error loading dashboard:', error);
    return [];
  }
}