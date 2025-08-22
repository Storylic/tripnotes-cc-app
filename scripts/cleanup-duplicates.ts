// scripts/cleanup-duplicates.ts
// Script to clean up duplicate activities in the database

import * as dotenv from 'dotenv';
import { db } from '../db/client';
import { activities, tripDays } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function cleanupDuplicates() {
  console.log('🧹 Starting cleanup of duplicate activities...');

  try {
    // Find duplicate activities (same day_id, time_block, and description)
    const duplicates = await db.execute(sql`
      WITH duplicates AS (
        SELECT 
          id,
          day_id,
          time_block,
          description,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY day_id, time_block, description 
            ORDER BY created_at ASC
          ) as rn
        FROM activities
        WHERE description IS NOT NULL AND description != ''
      )
      SELECT id 
      FROM duplicates 
      WHERE rn > 1
    `);

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate activities to remove`);
      
      const idsToDelete = duplicates.map((row: any) => row.id);
      
      // Delete duplicates using Drizzle's inArray
      if (idsToDelete.length > 0) {
        await db
          .delete(activities)
          .where(inArray(activities.id, idsToDelete));
        
        console.log(`✅ Deleted ${idsToDelete.length} duplicate activities`);
      }
    } else {
      console.log('✅ No duplicates found');
    }

    // Also clean up empty activities
    const emptyActivities = await db
      .select({ id: activities.id })
      .from(activities)
      .where(sql`${activities.description} IS NULL OR ${activities.description} = ''`);
    
    if (emptyActivities.length > 0) {
      const emptyIds = emptyActivities.map(a => a.id);
      await db
        .delete(activities)
        .where(inArray(activities.id, emptyIds));
      
      console.log(`✅ Removed ${emptyActivities.length} empty activities`);
    }

    // Show current activity count
    const activityCount = await db.execute(sql`
      SELECT 
        t.title as trip_title,
        td.title as day_title,
        td.day_number,
        COUNT(a.id) as activity_count
      FROM trips t
      JOIN trip_days td ON t.id = td.trip_id
      LEFT JOIN activities a ON td.id = a.day_id
      GROUP BY t.id, t.title, td.id, td.title, td.day_number
      ORDER BY t.title, td.day_number
    `);

    console.log('\n📊 Current activity counts per day:');
    activityCount.forEach((row: any) => {
      console.log(`  ${row.trip_title} - Day ${row.day_number} (${row.day_title}): ${row.activity_count} activities`);
    });

    console.log('\n🎉 Cleanup complete!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupDuplicates();