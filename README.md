# TripNotes CC

Creator-curated travel marketplace with AI-powered personalization.

## Tech Stack

- **Framework:** Next.js 15+ with App Router
- **Styling:** Tailwind CSS (built-in) + Shadcn UI
- **Database:** Supabase (PostgreSQL) with Drizzle ORM
- **Storage:** Cloudflare R2
- **Payments:** Stripe
- **AI:** OpenAI + Claude APIs
- **Maps:** Mapbox GL JS
- **State:** Zustand

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables in `.env.local`

3. Run database migrations:
```bash
pnpm db:migrate
```

4. Start development server:
```bash
pnpm dev
```

## Project Structure

```
tripnotes-cc/
├── app/              # Next.js App Router
├── components/       # React components
│   ├── ui/          # Shadcn components
│   └── custom/      # Custom components
├── lib/             # Utilities and helpers
├── db/              # Database schema and migrations
├── stores/          # Zustand state management
├── public/          # Static assets
├── scripts/         # Build and maintenance scripts
└── tests/           # Test files
```
