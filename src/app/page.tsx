'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Sparkles, ShieldCheck, Globe2, Chrome, Newspaper, Flame } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // Returning logged in user goes straight to personalized feed
        router.replace('/feed');
      } else {
        setCheckingAuth(false);
      }
    }
    checkUser();
  }, [router, supabase]);

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <SiteLogo variant="light" className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <SiteLogo variant="light" className="h-9 w-auto" />
        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link href="/login" className="px-4 py-2 text-gray-300 hover:text-white transition">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Personalized Political Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl">
          Unbiased Political News <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Tailored to Your Nation
          </span>
        </h1>

        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mt-4 leading-relaxed">
          Vospolis aggregates, analyzes, and contextualizes news from 23+ nations using AI factual extraction. Read full articles end-to-end without paywalls.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <Link
            href="/signup"
            className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>Sign Up Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Chrome className="w-4 h-4 text-blue-400" />
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="mt-4">
          <Link href="/feed" className="text-xs font-bold text-gray-400 hover:text-white underline transition">
            Browse as Guest →
          </Link>
        </div>

        {/* Visual Preview of Feed Cards */}
        <section className="mt-16 w-full max-w-5xl text-left space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" /> Live Feed Preview
            </span>
            <span className="text-[10px] text-gray-500">Updated Real-Time</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400 uppercase">Washington Digest • US 🇺🇸</span>
                <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded">BREAKING</span>
              </div>
              <h3 className="font-bold text-base text-white">US Congress Passes Landmark Bipartisan Cyber Security Bill</h3>
              <p className="text-xs text-gray-400 line-clamp-2">
                Mandatory 72-hour reporting for critical infrastructure and independent risk audits passed with supermajority support.
              </p>
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                <span>Claude Factual Analysis Attached</span>
                <span>Read Full Article →</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/80 border border-gray-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-400 uppercase">Japan Times • JP 🇯🇵</span>
                <span className="text-[10px] bg-purple-900/60 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-700">
                  AI Symbolic Art
                </span>
              </div>
              <h3 className="font-bold text-base text-white">National Diet Approves Renewable Energy Investment Act</h3>
              <p className="text-xs text-gray-400 line-clamp-2">
                Targets 45% carbon reduction by 2035 through offshore wind power expansion and regional grid storage systems.
              </p>
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
                <span>Agree/Disagree Poll Active</span>
                <span>Read Full Article →</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Vospolis Platform (vospolis.app). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
