// db/client.ts
// Database client configuration with Drizzle ORM

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For server-side usage, load env vars if not already loaded
if (!process.env.DATABASE_URL && typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables. Please check your .env.local file.');
}

// Create postgres connection
const queryClient = postgres(DATABASE_URL, {
  max: 1, // Use 1 for serverless environments
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema });

// Export schema for use in other files
export { schema };

// Type exports for better TypeScript support
export type DbClient = typeof db;
export type DbSchema = typeof schema;