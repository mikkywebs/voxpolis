'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error && !/rate|limit/i.test(error.message)) throw error;
      setSent(true); // same message whether or not the email exists (privacy)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-black">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            If an account exists for <strong>{email}</strong>, we have sent a link to reset your password. Check your inbox and spam folder.
            If you signed up with Google, just use “Continue with Google” instead.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Enter your email and we will send you a reset link.</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
