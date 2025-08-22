// app/editor/[id]/lib/types.ts
// Type definitions for the trip editor

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
  locationName?: string;
  locationLat?: string;
  locationLng?: string;
  gems: Gem[];
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  title: string;
  subtitle: string | null;
  summary?: string | null;
  activities: Activity[];
}

export interface Trip {
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
}

export interface TripData extends Trip {
  days: TripDay[];
}

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface EditorAction {
  type: 'UPDATE_TRIP' | 'ADD_DAY' | 'UPDATE_DAY' | 'DELETE_DAY' | 'REORDER_DAYS' |
        'ADD_ACTIVITY' | 'UPDATE_ACTIVITY' | 'DELETE_ACTIVITY' | 'MOVE_ACTIVITY' |
        'ADD_GEM' | 'UPDATE_GEM' | 'DELETE_GEM';
  payload: Record<string, unknown>;
  timestamp: Date;
}