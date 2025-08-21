// db/seed.ts
// Seed script for initial data

import * as dotenv from 'dotenv';
import { db } from './client';
import { users, trips, tripDays, activities, gems } from './schema';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create a platform curator user
    const [platformUser] = await db.insert(users).values({
      email: 'curator@tripnotes.cc',
      name: 'TripNotes Team',
      isCreator: true,
      isPlatformCurator: true,
      creatorVerified: true,
    }).returning();

    console.log('✅ Created platform curator user');

    // Create a sample trip
    const [tokyoTrip] = await db.insert(trips).values({
      creatorId: platformUser.id,
      isPlatformCreated: true,
      title: 'Tokyo: Beyond the Tourist Track',
      subtitle: '5 Days • Spring • ¥8,000-12,000/day',
      description: 'Experience Tokyo like a local with this carefully curated 5-day itinerary featuring hidden gems and authentic experiences.',
      destination: 'Tokyo, Japan',
      durationDays: 5,
      priceCents: 1800, // $18
      currency: 'USD',
      season: 'Spring',
      budgetRange: '¥8,000-12,000/day',
      tripStyle: 'Cultural Explorer',
      status: 'published',
      publishedAt: new Date(),
    }).returning();

    console.log('✅ Created sample trip');

    // Create Day 1
    const [day1] = await db.insert(tripDays).values({
      tripId: tokyoTrip.id,
      dayNumber: 1,
      title: 'Landing & Lost in Shibuya',
      subtitle: 'Ease into Tokyo\'s beautiful chaos',
      summary: 'Start your Tokyo adventure in the heart of Shibuya, getting oriented with the city\'s energy.',
    }).returning();

    // Create activities for Day 1
    const [morningActivity] = await db.insert(activities).values({
      dayId: day1.id,
      timeBlock: 'morning',
      description: '• Narita Express to Shibuya (¥3,190, 90 min)\n• Check into hotel, grab combini breakfast',
      orderIndex: 1,
    }).returning();

    const [afternoonActivity] = await db.insert(activities).values({
      dayId: day1.id,
      timeBlock: 'afternoon',
      description: '• Shibuya Crossing - go to Starbucks overlooking it',
      locationName: 'Shibuya Crossing',
      locationLat: '35.6595',
      locationLng: '139.7004',
      orderIndex: 2,
    }).returning();

    // Create a hidden gem
    await db.insert(gems).values({
      activityId: afternoonActivity.id,
      gemType: 'hidden_gem',
      title: 'Nonbei Yokocho',
      description: '"Drunkard\'s Alley" - 60 tiny bars crammed into 2 narrow alleys. Each seats maybe 6 people. Order beer and whatever the person next to you is having.',
      insiderInfo: '2 min from Shibuya Station, East Exit',
    });

    console.log('✅ Created sample trip content');

    // Create more days (abbreviated for brevity)
    for (let i = 2; i <= 5; i++) {
      await db.insert(tripDays).values({
        tripId: tokyoTrip.id,
        dayNumber: i,
        title: `Day ${i}`,
        subtitle: 'More adventures await',
      });
    }

    console.log('✅ Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seed().catch(console.error);