// db/schema/commerce.ts
// Purchase, earnings, and review tables

import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { trips, activities } from './trips';

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('USD').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
  stripeChargeId: text('stripe_charge_id'),
  status: text('status').notNull(), // pending/completed/failed/refunded
  refundedAt: timestamp('refunded_at'),
  refundReason: text('refund_reason'),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
});

export const userTripCustomizations = pgTable('user_trip_customizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'cascade' }),
  customizationType: text('customization_type').notNull(), // note/reorder/hide/ai_personalization
  activityId: uuid('activity_id').references(() => activities.id), // nullable for trip-level customizations
  customData: jsonb('custom_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userTripNotes = pgTable('user_trip_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id').references(() => activities.id), // nullable for trip-level notes
  note: text('note').notNull(),
  isPrivate: boolean('is_private').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id').notNull().references(() => trips.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id),
  rating: integer('rating').notNull(), // 1-5
  title: text('title'),
  content: text('content'),
  creatorResponse: text('creator_response'),
  creatorRespondedAt: timestamp('creator_responded_at'),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const creatorEarnings = pgTable('creator_earnings', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id),
  amountCents: integer('amount_cents').notNull(),
  platformFeeCents: integer('platform_fee_cents').notNull(),
  creatorNetCents: integer('creator_net_cents').notNull(),
  payoutStatus: text('payout_status').default('pending').notNull(), // pending/processing/paid/refunded
  stripeTransferId: text('stripe_transfer_id'),
  payoutId: text('payout_id'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for commerce tables
export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [purchases.tripId],
    references: [trips.id],
  }),
}));

export const userTripCustomizationsRelations = relations(userTripCustomizations, ({ one }) => ({
  user: one(users, {
    fields: [userTripCustomizations.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [userTripCustomizations.tripId],
    references: [trips.id],
  }),
  purchase: one(purchases, {
    fields: [userTripCustomizations.purchaseId],
    references: [purchases.id],
  }),
  activity: one(activities, {
    fields: [userTripCustomizations.activityId],
    references: [activities.id],
  }),
}));

export const userTripNotesRelations = relations(userTripNotes, ({ one }) => ({
  user: one(users, {
    fields: [userTripNotes.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [userTripNotes.tripId],
    references: [trips.id],
  }),
  activity: one(activities, {
    fields: [userTripNotes.activityId],
    references: [activities.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  trip: one(trips, {
    fields: [reviews.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  purchase: one(purchases, {
    fields: [reviews.purchaseId],
    references: [purchases.id],
  }),
}));

export const creatorEarningsRelations = relations(creatorEarnings, ({ one }) => ({
  creator: one(users, {
    fields: [creatorEarnings.creatorId],
    references: [users.id],
  }),
  purchase: one(purchases, {
    fields: [creatorEarnings.purchaseId],
    references: [purchases.id],
  }),
}));