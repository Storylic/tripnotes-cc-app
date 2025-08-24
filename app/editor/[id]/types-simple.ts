// app/editor/[id]/types-simple.ts
// Simplified type definitions for the editor

export interface Gem {
  id: string;
  title: string;
  description: string;
  gemType: 'hidden_gem' | 'tip' | 'warning';
  insiderInfo?: string | null;
}

export interface Activity {
  id: string;
  dayId: string;
  timeBlock: string;
  description: string;
  orderIndex: number;
  gems: Gem[];
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  subtitle: string | null;
  activities: Activity[];
}

export interface TripData {
  id: string;
  creatorId: string;
  title: string;
  subtitle: string;
  description: string | null;
  destination: string;
  durationDays: number;
  priceCents: number;
  currency: string;
  status: string;
  season?: string | null;
  budgetRange?: string | null;
  tripStyle?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  days: TripDay[];
}