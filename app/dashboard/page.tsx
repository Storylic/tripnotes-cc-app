// app/dashboard/page.tsx
// Dashboard using granular metadata loading for speed

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTripMetadataBatch } from '@/lib/cache/trip-cache-service';
import Link from 'next/link';
import TripCard from './components/trip-card';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // First, get list of trip IDs from DB (lightweight query)
  const userTripIds = await db
    .select({ id: trips.id, status: trips.status })
    .from(trips)
    .where(eq(trips.creatorId, user.id))
    .orderBy(trips.updatedAt);

  // Then batch-load metadata from cache (super fast)
  const tripIds = userTripIds.map(t => t.id);
  const metadataMap = await getTripMetadataBatch(tripIds);
  
  // Combine with status info
  const userTrips = userTripIds.map(t => ({
    ...metadataMap.get(t.id),
    id: t.id,
    status: t.status,
  })).filter(t => t.title); // Filter out any failed loads

  const draftTrips = userTrips.filter(t => t.status === 'draft');
  const publishedTrips = userTrips.filter(t => t.status === 'published');

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-pencil-gray)]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl text-[var(--color-ink)]">
                Creator Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user.email}
              </p>
            </div>
            <Link 
              href="/editor/new"
              className="px-6 py-3 bg-[var(--color-ink)] text-white rounded hover:opacity-90 transition-opacity"
            >
              Create New Trip
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-white p-4 rounded border border-[var(--color-pencil-gray)]">
            <div className="text-sm text-gray-600 mb-1">Total Trips</div>
            <div className="text-2xl font-bold text-[var(--color-ink)]">{userTrips.length}</div>
          </div>
          <div className="bg-white p-4 rounded border border-[var(--color-pencil-gray)]">
            <div className="text-sm text-gray-600 mb-1">Published</div>
            <div className="text-2xl font-bold text-[var(--color-ink)]">{publishedTrips.length}</div>
          </div>
          <div className="bg-white p-4 rounded border border-[var(--color-pencil-gray)]">
            <div className="text-sm text-gray-600 mb-1">Drafts</div>
            <div className="text-2xl font-bold text-[var(--color-ink)]">{draftTrips.length}</div>
          </div>
          <div className="bg-white p-4 rounded border border-[var(--color-pencil-gray)]">
            <div className="text-sm text-gray-600 mb-1">Cache</div>
            <div className="text-2xl font-mono text-green-600">✓ Fast</div>
          </div>
        </div>

        {/* Draft Trips */}
        {draftTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl text-[var(--color-ink)] mb-4">Draft Trips</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftTrips.map(trip => (
                <TripCard key={trip.id} trip={trip as any} />
              ))}
            </div>
          </div>
        )}

        {/* Published Trips */}
        {publishedTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl text-[var(--color-ink)] mb-4">Published Trips</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publishedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip as any} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {userTrips.length === 0 && (
          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-12 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="font-serif text-xl text-[var(--color-ink)] mb-2">
              No trips yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start creating your first travel masterpiece
            </p>
            <Link 
              href="/editor/new"
              className="inline-block px-6 py-3 bg-[var(--color-ink)] text-white rounded hover:opacity-90"
            >
              Create Your First Trip
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}