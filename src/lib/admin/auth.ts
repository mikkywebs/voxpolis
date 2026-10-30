import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AdminCheck {
  authorized: boolean;
  status?: number;
  error?: string;
  user?: { id: string; email?: string };
  name?: string;
}

/** Server-side admin check: a real Supabase session (Bearer token or cookie) + profiles.is_admin = true. */
export async function verifyAdmin(request: NextRequest): Promise<AdminCheck> {
  try {
    let user: any = null;
    const header = request.headers.get('authorization');
    if (header?.toLowerCase().startsWith('bearer ')) {
      const { data } = await supabaseAdmin.auth.getUser(header.slice(7).trim());
      user = data?.user || null;
    }
    if (!user) {
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
      } catch {}
    }
    if (!user) return { authorized: false, status: 401, error: 'Please sign in.' };

    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin, full_name').eq('id', user.id).maybeSingle();
    if (profile?.is_admin !== true) return { authorized: false, status: 403, error: 'Editor access only.' };
    return { authorized: true, user: { id: user.id, email: user.email }, name: profile.full_name || 'Voxpolis Editor' };
  } catch {
    return { authorized: false, status: 500, error: 'Authentication error' };
  }
}
