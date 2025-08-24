// app/dashboard/components/trip-card.tsx
// Client component for trip cards with hover prefetching

'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { prefetchTrip } from '../actions';

// Type for trip from database query
type TripFromDB = {
  id: string;
  title: string;
  subtitle: string | null;
  destination: string;
  durationDays: number;
  priceCents: number;
  status: string;
  coverImageUrl: string | null;
};

export default function TripCard({ trip }: { trip: TripFromDB }) {
  // Prefetch on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    // Call server action to warm cache in background
    prefetchTrip(trip.id).catch(console.error);
  }, [trip.id]);

  return (
    <div 
      className="bg-white rounded border border-[var(--color-pencil-gray)] overflow-hidden hover:shadow-md transition-shadow"
      onMouseEnter={handleMouseEnter}
    >
      {trip.coverImageUrl && (
        <div className="h-32 bg-gray-200">
          {/* Image would go here */}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-serif text-lg text-[var(--color-ink)] mb-1">
          {trip.title}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {trip.subtitle || `${trip.durationDays} days`}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {trip.status === 'published' ? (
              <span className="text-green-600">● Published</span>
            ) : (
              <span className="text-amber-600">● Draft</span>
            )}
          </span>
          <span className="font-mono text-[var(--color-stamp-red)]">
            ${(trip.priceCents / 100).toFixed(0)}
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          <Link 
            href={`/editor/${trip.id}`}
            className="flex-1 px-3 py-2 text-center text-sm border border-[var(--color-ink)] text-[var(--color-ink)] rounded hover:bg-gray-50"
          >
            Edit
          </Link>
          {trip.status === 'published' && (
            <Link 
              href={`/trips/${trip.id}`}
              className="flex-1 px-3 py-2 text-center text-sm bg-[var(--color-ink)] text-white rounded hover:opacity-90"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}