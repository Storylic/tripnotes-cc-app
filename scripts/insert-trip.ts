// scripts/insert-trip.ts
// Backdoor script to quickly insert trips from JSON files

import * as dotenv from 'dotenv';
import { db } from '../db/client';
import { users, trips, tripDays, activities, gems } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TripJson {
  trip: {
    title: string;
    subtitle: string;
    description: string;
    destination: string;
    durationDays: number;
    priceCents: number;
    currency: string;
    season?: string;
    budgetRange?: string;
    tripStyle?: string;
    status: 'draft' | 'published';
    creatorEmail: string;
  };
  days: Array<{
    dayNumber: number;
    title: string;
    subtitle?: string;
    summary?: string;
    activities: Array<{
      timeBlock: string;
      description: string;
      orderIndex: number;
      locationName?: string;
      locationLat?: string;
      locationLng?: string;
      estimatedCost?: string;
      gems: Array<{
        gemType: 'hidden_gem' | 'tip' | 'warning';
        title: string;
        description: string;
        insiderInfo?: string;
      }>;
    }>;
  }>;
}

async function insertTrip(jsonPath: string) {
  console.log('🚀 Starting trip insertion...');
  
  try {
    // Read and parse JSON file
    const fullPath = path.resolve(jsonPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    
    const jsonContent = fs.readFileSync(fullPath, 'utf-8');
    const tripData: TripJson = JSON.parse(jsonContent);
    
    console.log(`📖 Loading trip: "${tripData.trip.title}"`);
    
    // Find or create creator user
    let creator = await db
      .select()
      .from(users)
      .where(eq(users.email, tripData.trip.creatorEmail))
      .limit(1);
    
    if (creator.length === 0) {
      console.log(`👤 Creating user: ${tripData.trip.creatorEmail}`);
      const [newUser] = await db.insert(users).values({
        email: tripData.trip.creatorEmail,
        name: tripData.trip.creatorEmail.includes('curator') ? 'TripNotes Team' : 'Trip Creator',
        isCreator: true,
        isPlatformCurator: tripData.trip.creatorEmail.includes('curator'),
        creatorVerified: true,
      }).returning();
      creator = [newUser];
    } else {
      console.log(`✓ Using existing user: ${tripData.trip.creatorEmail}`);
    }
    
    // Create the trip
    const [newTrip] = await db.insert(trips).values({
      creatorId: creator[0].id,
      isPlatformCreated: tripData.trip.creatorEmail.includes('curator'),
      title: tripData.trip.title,
      subtitle: tripData.trip.subtitle,
      description: tripData.trip.description,
      destination: tripData.trip.destination,
      durationDays: tripData.trip.durationDays,
      priceCents: tripData.trip.priceCents,
      currency: tripData.trip.currency,
      season: tripData.trip.season,
      budgetRange: tripData.trip.budgetRange,
      tripStyle: tripData.trip.tripStyle,
      status: tripData.trip.status,
      publishedAt: tripData.trip.status === 'published' ? new Date() : null,
    }).returning();
    
    console.log(`✅ Created trip: ${newTrip.id}`);
    
    // Create days and activities
    for (const dayData of tripData.days) {
      const [newDay] = await db.insert(tripDays).values({
        tripId: newTrip.id,
        dayNumber: dayData.dayNumber,
        title: dayData.title,
        subtitle: dayData.subtitle,
        summary: dayData.summary,
      }).returning();
      
      console.log(`  📅 Created Day ${dayData.dayNumber}: ${dayData.title}`);
      
      // Create activities for this day
      for (const activityData of dayData.activities) {
        const [newActivity] = await db.insert(activities).values({
          dayId: newDay.id,
          timeBlock: activityData.timeBlock,
          description: activityData.description,
          orderIndex: activityData.orderIndex,
          locationName: activityData.locationName,
          locationLat: activityData.locationLat,
          locationLng: activityData.locationLng,
          estimatedCost: activityData.estimatedCost,
        }).returning();
        
        console.log(`    ⏰ Created ${activityData.timeBlock} activity`);
        
        // Create gems for this activity
        for (const gemData of activityData.gems) {
          await db.insert(gems).values({
            activityId: newActivity.id,
            gemType: gemData.gemType,
            title: gemData.title,
            description: gemData.description,
            insiderInfo: gemData.insiderInfo,
          });
          
          console.log(`      💎 Created ${gemData.gemType}: ${gemData.title}`);
        }
      }
    }
    
    console.log('\n🎉 Trip successfully inserted!');
    console.log(`📝 Trip ID: ${newTrip.id}`);
    console.log(`🔗 Edit URL: http://localhost:3000/editor/${newTrip.id}`);
    console.log(`👁️ Preview URL: http://localhost:3000/preview/${newTrip.id}`);
    
    if (tripData.trip.status === 'published') {
      console.log(`🌐 Public URL: http://localhost:3000/trips/${newTrip.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error inserting trip:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get file path from command line arguments
const jsonPath = process.argv[2];

if (!jsonPath) {
  console.log('Usage: pnpm tsx scripts/insert-trip.ts <path-to-json-file>');
  console.log('\nExample:');
  console.log('  pnpm tsx scripts/insert-trip.ts scripts/trip-templates/paris-2-days.json');
  console.log('\nAvailable templates:');
  
  const templatesDir = path.join(process.cwd(), 'scripts/trip-templates');
  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      console.log(`  - scripts/trip-templates/${file}`);
    });
  }
  
  process.exit(1);
}

insertTrip(jsonPath);