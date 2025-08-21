// app/page.tsx
// Homepage for TripNotes CC

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)]">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="font-serif text-5xl text-[var(--color-ink)] mb-4">
          TripNotes CC
        </h1>
        <p className="text-xl text-gray-600">
          Creator-curated travel plans, personalized for you.
        </p>
      </div>
    </main>
  );
}
