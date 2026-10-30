'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data?.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => router.replace('/'), 2000);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-black">Choose a new password</h1>
        {ready === false && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This reset link has expired or was already used.{' '}
            <Link href="/forgot-password" className="text-blue-600 underline">
              Request a new one
            </Link>
            .
          </p>
        )}
        {done && <p className="text-sm text-emerald-700">Password updated. Taking you home…</p>}
        {ready && !done && (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-full text-sm p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repeat new password" className="w-full text-sm p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50">
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
