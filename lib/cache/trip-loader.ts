// lib/cache/trip-loader.ts
// Optimized single-query trip loader

import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import type { TripData } from '@/app/editor/[id]/lib/types';

/**
 * Load complete trip data with a single optimized query
 * Uses PostgreSQL's JSON aggregation for maximum performance
 */
export async function loadTripDataOptimized(tripId: string): Promise<TripData | null> {
  const startTime = performance.now();
  
  try {
    // Single query using JSON aggregation
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

    const elapsed = performance.now() - startTime;
    console.log(`[DB Query] Trip ${tripId} loaded in ${elapsed.toFixed(2)}ms`);

    if (!result || result.length === 0) {
      console.log(`[DB Query] Trip ${tripId} not found`);
      return null;
    }

    const row = result[0] as any;
    
    // Transform the result to match TripData type
    // Ensure days is always an array, even if null from DB
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

    // Add creator info if needed (optional)
    if (row.creator_name) {
      (tripData as any).creator = {
        id: row.creator_id,
        name: row.creator_name,
        email: row.creator_email,
      };
    }

    return tripData;
  } catch (error) {
    console.error('[DB Query] Error loading trip:', error);
    throw error;
  }
}

/**
 * Load multiple trips efficiently (for dashboard)
 */
export async function loadTripsForUser(userId: string): Promise<any[]> {
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
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*) FROM trip_days WHERE trip_id = t.id) as day_count,
        (SELECT COUNT(*) FROM activities a 
         JOIN trip_days td ON a.day_id = td.id 
         WHERE td.trip_id = t.id) as activity_count
      FROM trips t
      WHERE t.creator_id = ${userId}
      ORDER BY t.updated_at DESC
    `);

    const elapsed = performance.now() - startTime;
    console.log(`[DB Query] User trips loaded in ${elapsed.toFixed(2)}ms`);

    return result as any[];
  } catch (error) {
    console.error('[DB Query] Error loading user trips:', error);
    throw error;
  }
}