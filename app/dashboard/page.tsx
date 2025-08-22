// app/dashboard/page.tsx
// Dashboard page showing user's trips and quick actions

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { trips } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user's trips
  const userTrips = await db
    .select()
    .from(trips)
    .where(eq(trips.creatorId, user.id))
    .orderBy(trips.updatedAt);

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
            <div className="text-sm text-gray-600 mb-1">Earnings</div>
            <div className="text-2xl font-mono text-[var(--color-stamp-red)]">$0.00</div>
          </div>
        </div>

        {/* Draft Trips */}
        {draftTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-xl text-[var(--color-ink)] mb-4">Draft Trips</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {draftTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
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
                <TripCard key={trip.id} trip={trip} />
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

// Type for trip from database query
type TripFromDB = {
  id: string;
  title: string;
  subtitle: string;
  durationDays: number;
  priceCents: number;
  status: string;
  coverImageUrl: string | null;
};

function TripCard({ trip }: { trip: TripFromDB }) {
  return (
    <div className="bg-white rounded border border-[var(--color-pencil-gray)] overflow-hidden hover:shadow-md transition-shadow">
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