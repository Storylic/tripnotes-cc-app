// app/api/cache/test/route.ts
// API route for testing cache operations

import { NextRequest, NextResponse } from 'next/server';
import { setKV, getKV } from '@/lib/cache/redisBridge';
import { TripCacheService } from '@/lib/cache/trip-cache-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation, key, value, ttl, tripId } = body;

    switch (operation) {
      case 'set': {
        const result = await setKV({
          key,
          value: JSON.stringify(value),
          ttl_seconds: ttl || 60,
        });
        return NextResponse.json({ success: result.ok });
      }

      case 'get': {
        const result = await getKV(key);
        return NextResponse.json({ 
          success: true,
          value: result.value ? JSON.parse(result.value) : null,
        });
      }

      case 'trip-load': {
        // Simulate trip load
        const mockTrip = {
          id: tripId || 'test-trip',
          title: 'Test Trip',
          creatorId: user.id,
          days: [],
        };
        
        await TripCacheService.set(mockTrip.id, mockTrip as any, 60);
        const cached = await TripCacheService.get(mockTrip.id);
        
        return NextResponse.json({ 
          success: !!cached,
          cached: !!cached,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cache test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}