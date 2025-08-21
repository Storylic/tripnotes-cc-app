// lib/types/index.ts
// Core type definitions for TripNotes CC

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isCreator: boolean;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trip {
  id: string;
  creatorId: string;
  title: string;
  subtitle: string;
  description?: string;
  price: number;
  currency: string;
  duration: number;
  season?: string;
  budget?: string;
  status: 'draft' | 'published' | 'archived';
  coverImageUrl?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  subtitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  dayId: string;
  timeBlock: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Gem {
  id: string;
  activityId: string;
  title: string;
  description: string;
  type: 'hidden_gem' | 'tip' | 'warning';
  // was: Record<string, any>
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  userId: string;
  tripId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: Date;
}
