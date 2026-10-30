'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const KEY = 'voxpolis_after_login';

/** Remember where to go after signing in (survives the Google round-trip). */
export function rememberAfterLogin(path: string) {
  try {
    if (path && path.startsWith('/') && !path.startsWith('//')) {
      localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
    }
  } catch {}
}

/** Sends a freshly signed-in user to the page they asked for, even if the sign-in provider dropped it. */
export default function AuthReturn() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const go = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const { path, at } = JSON.parse(raw);
        localStorage.removeItem(KEY);
        if (Date.now() - at < 15 * 60_000 && path && path !== pathname) router.replace(path);
      } catch {}
    };
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => data?.session && go());
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') go();
    });
    return () => data?.subscription?.unsubscribe();
  }, [router, pathname]);

  return null;
}
