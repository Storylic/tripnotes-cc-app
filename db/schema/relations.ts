// db/schema/relations.ts
// All cross-table relations defined in one place to avoid circular dependencies

import { relations } from 'drizzle-orm';
import { users, userProfiles } from './users';
import { trips, tripDays, activities, tripPhotos, promptTemplates } from './trips';
import { purchases, reviews, creatorEarnings, userTripCustomizations, userTripNotes } from './commerce';

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles),
  trips: many(trips),
  purchases: many(purchases),
  reviews: many(reviews),
  earnings: many(creatorEarnings),
  customizations: many(userTripCustomizations),
  notes: many(userTripNotes),
}));

// Trip relations
export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(users, {
    fields: [trips.creatorId],
    references: [users.id],
  }),
  days: many(tripDays),
  photos: many(tripPhotos),
  promptTemplates: many(promptTemplates),
  purchases: many(purchases),
  reviews: many(reviews),
  customizations: many(userTripCustomizations),
  notes: many(userTripNotes),
}));