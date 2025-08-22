// scripts/create-test-user.ts
// Script to create a test user for development

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client';
import { users } from '../db/schema';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function createTestUser() {
  console.log('🔐 Creating test user...');

  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@tripnotes.cc',
      password: 'testpass123',
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('ℹ️ Test user already exists in Auth');
        
        // Get the existing user
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        const existingUser = authUsers.find(u => u.email === 'test@tripnotes.cc');
        
        if (existingUser) {
          // Check if user exists in our database
          const [dbUser] = await db.select().from(users).where(eq(users.id, existingUser.id)).limit(1);
          
          if (!dbUser) {
            // Create user in database
            await db.insert(users).values({
              id: existingUser.id,
              email: 'test@tripnotes.cc',
              name: 'Test Creator',
              isCreator: true,
            });
            console.log('✅ Added test user to database');
          } else {
            console.log('✅ Test user already in database');
          }
        }
      } else {
        throw authError;
      }
    } else if (authData.user) {
      // Create user in our database
      await db.insert(users).values({
        id: authData.user.id,
        email: 'test@tripnotes.cc',
        name: 'Test Creator',
        isCreator: true,
      });

      console.log('✅ Test user created successfully!');
    }

    console.log('\n📧 Login credentials:');
    console.log('Email: test@tripnotes.cc');
    console.log('Password: testpass123');
    console.log('\n🔗 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Import eq from drizzle-orm
import { eq } from 'drizzle-orm';

createTestUser();