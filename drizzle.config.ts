// drizzle.config.ts
// Drizzle CLI config for TripNotes-CC: loads env and defines PG creds (no Next runtime usage)

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env.local');
}

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL, // <- correct key for drizzle-kit 0.31.x
    // ssl: 'require', // uncomment if your DB needs SSL
  },
  verbose: true,
  strict: true,
});
