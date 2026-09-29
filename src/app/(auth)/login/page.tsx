'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, LogIn, Chrome } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      router.push('/feed');
    } catch (e: any) {
      setErrorMsg(e.message || 'Login failed.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('not enabled') ||
          error.message?.toLowerCase().includes('unsupported provider') ||
          (error as any).code === 400 ||
          (error as any).error_code === 'validation_failed'
        ) {
          setErrorMsg('Google Sign-In is not currently enabled in Supabase Auth settings. Please sign in using your Email Address below, or enable the Google provider in your Supabase Dashboard.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Google OAuth failed.');
      setLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('not enabled') ||
          error.message?.toLowerCase().includes('unsupported provider') ||
          (error as any).code === 400 ||
          (error as any).error_code === 'validation_failed'
        ) {
          setErrorMsg('X / Twitter Sign-In is not currently enabled in Supabase Auth settings. Please enable the Twitter provider in your Supabase Dashboard.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'X / Twitter OAuth failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="text-center">
          <Link href="/">
            <SiteLogo variant="full" className="h-10 w-auto mx-auto mb-3" />
          </Link>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Sign In to Voxpolis</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Access personalized global political intelligence</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition"
          >
            <Chrome className="w-4 h-4 text-blue-600" />
            <span>Continue with Google</span>
          </button>

          <button
            onClick={handleTwitterLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-black text-white font-semibold text-xs hover:bg-gray-900 shadow-sm transition"
          >
            <span className="font-black text-sm">𝕏</span>
            <span>Continue with X / Twitter</span>
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
          <span className="bg-white dark:bg-gray-900 px-3 text-[10px] uppercase font-bold text-gray-400 absolute">
            Or with email
          </span>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="michael@example.com"
                className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
            Sign Up
          </Link>
        </p>

        <div className="text-center pt-2">
          <Link href="/feed" className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            ← Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}
