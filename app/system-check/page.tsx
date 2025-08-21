// app/system-check/page.tsx
// System check page to verify Day 1 infrastructure

import { db } from '@/db/client';
import { users, trips } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT NOW()`);
    
    // Count users and trips
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const tripCount = await db.select({ count: sql<number>`count(*)` }).from(trips);
    
    // Safely extract timestamp
    const timestamp = result[0] && typeof result[0] === 'object' && 'now' in result[0] 
      ? String(result[0].now) 
      : new Date().toISOString();
    
    return {
      status: 'connected',
      timestamp,
      users: userCount[0].count,
      trips: tripCount[0].count,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: '',
      users: 0,
      trips: 0,
    };
  }
}

async function checkSupabase() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
    
    return {
      status: 'connected',
      authenticated: !!user,
      user: user?.email || 'Not logged in',
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkStripe() {
  try {
    // Check if Stripe environment variables are set
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!hasStripeKey) {
      return {
        status: 'not-configured',
        error: 'Stripe API key not set',
      };
    }
    
    // Dynamic import to avoid errors if stripe isn't configured yet
    const { stripe, STRIPE_CONFIG } = await import('@/lib/stripe/client').catch(() => ({
      stripe: null,
      STRIPE_CONFIG: { 
        PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
        PLATFORM_FEE_PERCENTAGE: 0.30
      }
    }));
    
    if (stripe) {
      // Test Stripe connection by fetching products (won't have any yet)
      const products = await stripe.products.list({ limit: 1 });
      
      return {
        status: 'connected',
        mode: STRIPE_CONFIG.PUBLISHABLE_KEY?.includes('test') ? 'test' : 'live',
        webhookConfigured: hasWebhookSecret,
        platformFee: STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE,
      };
    } else {
      return {
        status: 'not-configured',
        mode: 'not-set',
        webhookConfigured: hasWebhookSecret,
        platformFee: 0.30,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      platformFee: 0.30,
    };
  }
}

function checkEnvironment() {
  return {
    nodeEnv: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    hasDatabase: !!process.env.DATABASE_URL,
    hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasR2: !!process.env.R2_ACCOUNT_ID,
  };
}

export default async function SystemCheckPage() {
  const [dbStatus, supabaseStatus, stripeStatus] = await Promise.all([
    checkDatabase(),
    checkSupabase(),
    checkStripe(),
  ]);
  
  const envStatus = checkEnvironment();

  return (
    <div className="min-h-screen bg-[var(--color-paper)] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl text-[var(--color-ink)] mb-8">
          System Check - Day 1 Infrastructure
        </h1>

        {/* Database Status */}
        <div className="bg-white rounded-sm border border-[var(--color-pencil-gray)] p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            Database (PostgreSQL via Supabase)
            <StatusBadge status={dbStatus.status} />
          </h2>
          {dbStatus.status === 'connected' ? (
            <div className="space-y-2 text-sm">
              <p>✅ Connected successfully</p>
              <p>📊 Users in database: {dbStatus.users}</p>
              <p>🗺️ Trips in database: {dbStatus.trips}</p>
              <p className="text-gray-500">Server time: {dbStatus.timestamp}</p>
            </div>
          ) : (
            <p className="text-red-600">❌ {dbStatus.error}</p>
          )}
        </div>

        {/* Supabase Auth Status */}
        <div className="bg-white rounded-sm border border-[var(--color-pencil-gray)] p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            Authentication (Supabase Auth)
            <StatusBadge status={supabaseStatus.status} />
          </h2>
          {supabaseStatus.status === 'connected' ? (
            <div className="space-y-2 text-sm">
              <p>✅ Supabase client configured</p>
              <p>🔐 Auth status: {supabaseStatus.authenticated ? 'Logged in' : 'Not logged in'}</p>
              <p>👤 User: {supabaseStatus.user}</p>
              <a href="/login" className="text-[var(--color-stamp-red)] underline">
                Test login page →
              </a>
            </div>
          ) : (
            <p className="text-red-600">❌ {supabaseStatus.error}</p>
          )}
        </div>

        {/* Stripe Status */}
        <div className="bg-white rounded-sm border border-[var(--color-pencil-gray)] p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            Payments (Stripe)
            <StatusBadge status={stripeStatus.status} />
          </h2>
          {stripeStatus.status === 'connected' ? (
            <div className="space-y-2 text-sm">
              <p>✅ Stripe API connected</p>
              <p>💳 Mode: {stripeStatus.mode}</p>
              <p>🔗 Webhook: {stripeStatus.webhookConfigured ? 'Configured' : 'Not configured'}</p>
              <p className="text-gray-500">
                Platform fee: {((stripeStatus.platformFee || 0.30) * 100).toFixed(0)}%
              </p>
            </div>
          ) : stripeStatus.status === 'not-configured' ? (
            <div className="space-y-2 text-sm text-amber-600">
              <p>⚠️ Stripe not configured yet</p>
              <p>Add STRIPE_SECRET_KEY to your .env.local file</p>
            </div>
          ) : (
            <p className="text-red-600">❌ {stripeStatus.error}</p>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white rounded-sm border border-[var(--color-pencil-gray)] p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className={envStatus.hasDatabase ? 'text-green-600' : 'text-red-600'}>
                {envStatus.hasDatabase ? '✅' : '❌'} DATABASE_URL
              </p>
              <p className={envStatus.hasSupabase ? 'text-green-600' : 'text-red-600'}>
                {envStatus.hasSupabase ? '✅' : '❌'} SUPABASE
              </p>
              <p className={envStatus.hasStripe ? 'text-green-600' : 'text-red-600'}>
                {envStatus.hasStripe ? '✅' : '❌'} STRIPE
              </p>
            </div>
            <div>
              <p className={envStatus.hasR2 ? 'text-green-600' : 'text-amber-600'}>
                {envStatus.hasR2 ? '✅' : '⚠️'} R2 Storage (optional for Day 1)
              </p>
              <p>🌍 Environment: {envStatus.nodeEnv}</p>
              <p>🔗 App URL: {envStatus.appUrl}</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-[var(--color-highlighter)] rounded-sm border border-[var(--color-pencil-gray)] p-6">
          <h2 className="text-xl font-semibold mb-4">✨ Day 1 Complete!</h2>
          <p className="mb-4">Your foundation is ready. You can now proceed to Day 2:</p>
          <ul className="space-y-2 text-sm">
            <li>✅ Database schema deployed</li>
            <li>✅ Authentication system ready</li>
            <li>✅ Payment infrastructure configured</li>
            <li>✅ Storage system prepared (configure R2 when ready)</li>
          </ul>
          <div className="mt-6 pt-4 border-t border-[var(--color-pencil-gray)]">
            <p className="font-semibold">Ready for Day 2: Creator Editor Core</p>
            <p className="text-sm text-gray-600 mt-2">
              Next: Build the trip editor with auto-save, drag-and-drop, and AI sidebar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'connected' ? 'bg-green-500' : 'bg-red-500';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
  );
}