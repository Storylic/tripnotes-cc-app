// app/preview/[id]/trip-viewer.tsx
// Client component for viewing trips (preview and public view)

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Trip, TripDay, Activity, Gem } from '@/app/editor/[id]/lib/types';

interface TripWithCreator extends Trip {
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  days: Array<TripDay & {
    activities: Array<Activity & {
      gems: Gem[];
    }>;
  }>;
}

interface TripViewerProps {
  trip: TripWithCreator;
  isOwner: boolean;
  hasPurchased: boolean;
  isPreview: boolean;
}

export default function TripViewer({ trip, isOwner, hasPurchased, isPreview }: TripViewerProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([trip.days[0]?.id]));

  const toggleDay = (dayId: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Preview Banner */}
      {isPreview && isOwner && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <span className="font-semibold">Preview Mode</span>
              <span>•</span>
              <span>This is how your trip will appear to users</span>
            </div>
            <Link 
              href={`/editor/${trip.id}`}
              className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              ← Back to Editor
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-80 bg-gradient-to-b from-gray-700 to-gray-900 overflow-hidden">
        {trip.coverImageUrl ? (
          <div className="relative w-full h-full">
            <Image 
              src={trip.coverImageUrl} 
              alt={trip.title}
              fill
              className="object-cover opacity-70"
              priority
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white/20 text-6xl">🗺️</div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-white/90 text-sm mb-2">
              {trip.destination} • {trip.durationDays} Days • {trip.season || 'All Seasons'}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-2">
              {trip.title}
            </h1>
            <p className="text-xl text-white/90 mb-4">
              {trip.subtitle}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                <div className="w-8 h-8 bg-[var(--color-stamp-red)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {trip.creator?.name?.[0] || 'T'}
                </div>
                <div className="text-white">
                  <div className="text-sm font-semibold">{trip.creator?.name || 'TripNotes Team'}</div>
                  <div className="text-xs opacity-90">Trip Creator</div>
                </div>
              </div>
              {trip.status === 'draft' && (
                <div className="px-3 py-2 bg-amber-500 text-white text-sm font-semibold rounded">
                  DRAFT
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-b border-[var(--color-pencil-gray)] sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-mono font-bold text-[var(--color-stamp-red)]">
              {formatPrice(trip.priceCents)}
            </div>
            {trip.budgetRange && (
              <div className="text-sm text-gray-600">
                Budget: {trip.budgetRange}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isOwner ? (
              <>
                <Link 
                  href={`/editor/${trip.id}`}
                  className="px-4 py-2 border border-[var(--color-ink)] text-[var(--color-ink)] rounded hover:bg-gray-50"
                >
                  Edit Trip
                </Link>
                <button className="px-4 py-2 bg-[var(--color-ink)] text-white rounded hover:opacity-90">
                  View Analytics
                </button>
              </>
            ) : hasPurchased ? (
              <button className="px-6 py-2 bg-green-600 text-white rounded">
                ✓ Purchased
              </button>
            ) : (
              <>
                <button className="px-4 py-2 border border-[var(--color-ink)] text-[var(--color-ink)] rounded hover:bg-gray-50">
                  ♡ Save
                </button>
                <button className="px-6 py-2 bg-[var(--color-ink)] text-white rounded hover:opacity-90">
                  Get This Trip
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Trip Description */}
        {trip.description && (
          <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6 mb-6">
            <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-4">About This Trip</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{trip.description}</p>
          </div>
        )}

        {/* Trip Essentials */}
        <div className="bg-white rounded border border-[var(--color-pencil-gray)] p-6 mb-6">
          <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-4">Trip Essentials</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Best Time</div>
              <div className="font-semibold">{trip.season || 'Year-round'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duration</div>
              <div className="font-semibold">{trip.durationDays} Days</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Budget</div>
              <div className="font-semibold">{trip.budgetRange || 'Flexible'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Style</div>
              <div className="font-semibold">{trip.tripStyle || 'Adventure'}</div>
            </div>
          </div>
        </div>

        {/* Day by Day Itinerary */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-[var(--color-ink)] mb-4">Your {trip.durationDays}-Day Journey</h2>
          
          {trip.days.map((day) => (
            <div 
              key={day.id}
              className={`bg-white rounded border border-[var(--color-pencil-gray)] overflow-hidden transition-shadow ${
                expandedDays.has(day.id) ? 'shadow-md' : ''
              }`}
            >
              {/* Day Header */}
              <div 
                className="p-4 bg-[var(--color-paper)] cursor-pointer hover:bg-[var(--color-paper)]/70 transition-colors"
                onClick={() => toggleDay(day.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 bg-[var(--color-stamp-red)] text-white rounded flex items-center justify-center font-bold">
                      {day.dayNumber}
                    </span>
                    <div>
                      <h3 className="font-semibold text-lg">{day.title}</h3>
                      {day.subtitle && (
                        <p className="text-sm text-gray-600">{day.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className={`transform transition-transform ${expandedDays.has(day.id) ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>
              </div>

              {/* Day Content */}
              {expandedDays.has(day.id) && (
                <div className="p-6 border-t border-[var(--color-pencil-gray)]">
                  {day.activities.length === 0 ? (
                    <p className="text-gray-500 italic">No activities planned yet</p>
                  ) : (
                    <div className="space-y-6">
                      {day.activities.map((activity) => (
                        <div key={activity.id} className="relative">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="text-xs font-semibold text-[var(--color-stamp-red)] uppercase tracking-wider">
                                {activity.timeBlock}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-700 whitespace-pre-wrap">
                                {activity.description}
                              </div>
                              
                              {/* Gems */}
                              {activity.gems?.map((gem) => (
                                <div 
                                  key={gem.id}
                                  className="mt-4 pl-4 border-l-4 border-[var(--color-stamp-red)]"
                                >
                                  <div className="bg-gradient-to-r from-[var(--color-highlighter)]/30 to-transparent p-3 -ml-4">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[var(--color-stamp-red)]">✎</span>
                                      <div>
                                        <div className="font-semibold text-[var(--color-stamp-red)] mb-1">
                                          {gem.title}
                                        </div>
                                        <div className="text-sm text-gray-700">
                                          {gem.description}
                                        </div>
                                        {gem.insiderInfo && (
                                          <div className="text-xs text-gray-500 mt-2">
                                            💡 {gem.insiderInfo}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Customization Prompt (if purchased) */}
        {(hasPurchased || isOwner) && (
          <div className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded border border-purple-200 p-6">
            <h3 className="font-serif text-xl text-[var(--color-ink)] mb-3">
              ✨ Make This Trip Yours
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Copy this prompt to ChatGPT or Claude to customize for your specific needs:
            </p>
            <div className="bg-white rounded border border-gray-300 p-4 font-mono text-xs">
              I&apos;m taking a {trip.durationDays}-day trip to {trip.destination}. 
              Please help me customize this itinerary for [YOUR DATES] with a budget of [YOUR BUDGET]. 
              I&apos;m interested in [YOUR INTERESTS]. Here&apos;s the base itinerary...
            </div>
            <button className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
              Copy Full Prompt
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
          <div>
            📍 {trip.days.reduce((sum: number, d) => sum + d.activities.length, 0)} activities
          </div>
          <div>
            💎 {trip.days.reduce((sum: number, d) => 
              sum + d.activities.reduce((s: number, a) => s + (a.gems?.length || 0), 0), 0
            )} hidden gems
          </div>
          <div>
            🗓️ {trip.durationDays} days
          </div>
        </div>
      </div>
    </div>
  );
}