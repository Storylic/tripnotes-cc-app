// scripts/list-trips.ts
// Script to list all trips in the database

import * as dotenv from 'dotenv';
import { db } from '../db/client';
import { trips, users, tripDays, activities } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function listTrips() {
  console.log('📚 Fetching all trips from database...\n');
  
  try {
    // Get all trips with creator info
    const allTrips = await db
      .select({
        id: trips.id,
        title: trips.title,
        subtitle: trips.subtitle,
        destination: trips.destination,
        days: trips.durationDays,
        price: trips.priceCents,
        status: trips.status,
        creatorName: users.name,
        creatorEmail: users.email,
        createdAt: trips.createdAt,
        publishedAt: trips.publishedAt,
      })
      .from(trips)
      .leftJoin(users, eq(trips.creatorId, users.id))
      .orderBy(trips.createdAt);
    
    if (allTrips.length === 0) {
      console.log('No trips found in database.');
      console.log('\nTo add a trip, run:');
      console.log('  pnpm tsx scripts/insert-trip.ts scripts/trip-templates/paris-2-days.json');
      return;
    }
    
    console.log(`Found ${allTrips.length} trip(s):\n`);
    console.log('─'.repeat(80));
    
    for (const trip of allTrips) {
      // Get activity count for this trip
      const [stats] = await db
        .select({
          dayCount: sql<number>`count(distinct ${tripDays.id})`,
          activityCount: sql<number>`count(distinct ${activities.id})`,
        })
        .from(tripDays)
        .leftJoin(activities, eq(activities.dayId, tripDays.id))
        .where(eq(tripDays.tripId, trip.id));
      
      console.log(`📍 ${trip.title}`);
      console.log(`   ID: ${trip.id}`);
      console.log(`   Subtitle: ${trip.subtitle || 'N/A'}`);
      console.log(`   Destination: ${trip.destination}`);
      console.log(`   Duration: ${trip.days} days`);
      console.log(`   Price: $${(trip.price / 100).toFixed(2)}`);
      console.log(`   Status: ${trip.status === 'published' ? '🟢 Published' : '🟡 Draft'}`);
      console.log(`   Creator: ${trip.creatorName} (${trip.creatorEmail})`);
      console.log(`   Content: ${stats.dayCount || 0} days, ${stats.activityCount || 0} activities`);
      console.log(`   Created: ${trip.createdAt?.toLocaleDateString()}`);
      if (trip.publishedAt) {
        console.log(`   Published: ${trip.publishedAt.toLocaleDateString()}`);
      }
      console.log(`\n   URLs:`);
      console.log(`   • Edit: http://localhost:3000/editor/${trip.id}`);
      console.log(`   • Preview: http://localhost:3000/preview/${trip.id}`);
      if (trip.status === 'published') {
        console.log(`   • Public: http://localhost:3000/trips/${trip.id}`);
      }
      console.log('─'.repeat(80));
    }
    
    // Summary stats
    const publishedCount = allTrips.filter(t => t.status === 'published').length;
    const draftCount = allTrips.filter(t => t.status === 'draft').length;
    
    console.log('\n📊 Summary:');
    console.log(`   Total trips: ${allTrips.length}`);
    console.log(`   Published: ${publishedCount}`);
    console.log(`   Drafts: ${draftCount}`);
    
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

listTrips();