// app/login/page.tsx
// Basic login page for testing auth

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setError('Check your email for confirmation link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
      <div className="bg-white p-8 rounded-sm border border-[var(--color-pencil-gray)] shadow-sm max-w-md w-full">
        <h1 className="font-serif text-2xl text-[var(--color-ink)] mb-6">
          Welcome to TripNotes CC
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-pencil-gray)] rounded-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-pencil-gray)] rounded-sm"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-[var(--color-stamp-red)]">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--color-ink)] text-white py-2 px-4 rounded-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Log In'}
            </button>
            
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 border border-[var(--color-ink)] text-[var(--color-ink)] py-2 px-4 rounded-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>

        {/* Development Quick Login */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t border-[var(--color-pencil-gray)]">
            <p className="text-xs text-gray-500 mb-3">Development Quick Login:</p>
            <button
              type="button"
              onClick={() => {
                setEmail('test@tripnotes.cc');
                setPassword('testpass123');
              }}
              className="w-full text-xs py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Fill Test Credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}