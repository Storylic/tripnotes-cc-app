// db/schema/trips.ts
// Trip content and structure tables

import { pgTable, text, boolean, timestamp, uuid, integer, decimal, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  isPlatformCreated: boolean('is_platform_created').default(false).notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  description: text('description'),
  destination: text('destination').notNull(),
  durationDays: integer('duration_days').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').default('USD').notNull(),
  season: text('season'),
  budgetRange: text('budget_range'),
  tripStyle: text('trip_style'),
  coverImageUrl: text('cover_image_url'),
  mediaDisplayPreference: text('media_display_preference').default('on_request').notNull(), // always/on_request/never
  status: text('status').default('draft').notNull(), // draft/published/archived
  viewCount: integer('view_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  averageRating: decimal('average_rating', { precision: 2, scale: 1 }),
  delightScore: integer('delight_score').default(0), // Joy metric
  seoMetadata: jsonb('seo_metadata'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tripDays = pgTable('trip_days', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  dayId: uuid('day_id').notNull().references(() => tripDays.id, { onDelete: 'cascade' }),
  timeBlock: text('time_block').notNull(), // morning/afternoon/evening/custom
  startTime: text('start_time'),
  endTime: text('end_time'),
  title: text('title'),
  description: text('description').notNull(),
  locationName: text('location_name'),
  locationLat: decimal('location_lat', { precision: 10, scale: 8 }),
  locationLng: decimal('location_lng', { precision: 11, scale: 8 }),
  activityType: text('activity_type'),
  estimatedCost: text('estimated_cost'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const gems = pgTable('gems', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  gemType: text('gem_type').notNull(), // hidden_gem/tip/warning
  title: text('title').notNull(),
  description: text('description').notNull(),
  insiderInfo: text('insider_info'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tripPhotos = pgTable('trip_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  thumbnailR2Key: text('thumbnail_r2_key'),
  caption: text('caption'),
  orderIndex: integer('order_index').default(0).notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  promptTemplate: text('prompt_template').notNull(),
  promptCategory: text('prompt_category'),
  orderIndex: integer('order_index').default(0).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations for trip tables
export const tripDaysRelations = relations(tripDays, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripDays.tripId],
    references: [trips.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  day: one(tripDays, {
    fields: [activities.dayId],
    references: [tripDays.id],
  }),
  gems: many(gems),
  photos: many(tripPhotos),
}));

export const gemsRelations = relations(gems, ({ one }) => ({
  activity: one(activities, {
    fields: [gems.activityId],
    references: [activities.id],
  }),
}));

export const tripPhotosRelations = relations(tripPhotos, ({ one }) => ({
  trip: one(trips, {
    fields: [tripPhotos.tripId],
    references: [trips.id],
  }),
  activity: one(activities, {
    fields: [tripPhotos.activityId],
    references: [activities.id],
  }),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ one }) => ({
  trip: one(trips, {
    fields: [promptTemplates.tripId],
    references: [trips.id],
  }),
}));