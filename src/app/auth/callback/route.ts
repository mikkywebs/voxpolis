import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const cookieStore = cookies();
    let redirectPath = next || '/onboarding';
    const response = NextResponse.redirect(`${origin}${redirectPath}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {}
              try {
                response.cookies.set(name, value, options);
              } catch {}
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session?.user) {
      const user = data.session.user;
      const hasCompletedProfile = !!(user.user_metadata?.username && user.user_metadata?.primary_country);

      let targetPath = '/onboarding';
      if (!hasCompletedProfile) {
        targetPath = next ? `/onboarding?next=${encodeURIComponent(next)}` : '/onboarding';
      } else if (next && next.startsWith('/')) {
        targetPath = next;
      } else {
        const countryObj = getCountryByCode(user.user_metadata?.primary_country || 'NG');
        targetPath = `/${getCountrySlug(countryObj)}`;
      }

      const finalResponse = NextResponse.redirect(`${origin}${targetPath}`);
      response.cookies.getAll().forEach((c) => {
        finalResponse.cookies.set(c.name, c.value, c);
      });
      return finalResponse;
    }
  }

  // Redirect to login with error notification if verification code failed
  return NextResponse.redirect(`${origin}/login?error=Verification+failed.+Please+try+signing+in.`);
}
