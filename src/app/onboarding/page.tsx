'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { ArrowRight } from 'lucide-react';

/**
 * Finish sign-up: name and username only. Everyone reads the same Nigeria, Africa and World sections.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const { data } = await createClient().auth.getSession();
        const user = data?.session?.user;
        if (!user) return;
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        setUsername(user.user_metadata?.username || (user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : ''));
      } catch {}
    })();
  }, []);

  const goNext = () => {
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) return router.push(next);
    } catch {}
    router.push('/');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username: 3-20 letters, numbers or underscores.');
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        router.push('/login?redirect=/onboarding');
        return;
      }
      const name = fullName.trim() || user.email?.split('@')[0] || 'Member';
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          username: cleanUsername,
          initial_name: user.user_metadata?.initial_name || name,
          member_since: user.user_metadata?.member_since || user.created_at || new Date().toISOString(),
        },
      });
      if (authErr) throw authErr;
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: name, updated_at: new Date().toISOString() });
      try {
        localStorage.setItem('voxpolis_user_name', name);
        localStorage.setItem('voxpolis_username', cleanUsername);
      } catch {}
      goNext();
    } catch (err: any) {
      setError(err?.message || 'Could not save. Try again.');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <SiteLogo />
        </div>
        <form onSubmit={save} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Welcome to Voxpolis</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose how your name appears when you comment and vote in polls.</p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your name</span>
            <input
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ada Okafor"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Username</span>
            <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="pl-3 text-gray-400 text-sm">@</span>
              <input
                className="w-full bg-transparent px-1 py-2.5 text-sm focus:outline-none"
                placeholder="adaokafor"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ''))}
                autoComplete="username"
                required
              />
            </div>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Start reading'}
            {!saving && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </main>
  );
}
