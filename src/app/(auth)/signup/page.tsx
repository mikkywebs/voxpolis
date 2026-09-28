'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { createClient } from '@/lib/supabase/client';
import { getCountryByCode, ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { Mail, Lock, User, UserPlus, Chrome, MapPin, CheckSquare, Square, ShieldCheck } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathProblem, setMathProblem] = useState({ a: 5, b: 3 });

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-detect Country via IP address on mount
  useEffect(() => {
    // Generate simple security math puzzle
    const num1 = Math.floor(Math.random() * 8) + 2;
    const num2 = Math.floor(Math.random() * 8) + 1;
    setMathProblem({ a: num1, b: num2 });

    async function detectIpCountry() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.country_code) {
            const country = getCountryByCode(data.country_code);
            setDetectedCountry(country);
            localStorage.setItem('voxpolis_primary_country', country.code);
          }
        }
      } catch {
        // Fallback default
        const country = getCountryByCode('NG');
        setDetectedCountry(country);
      }
    }

    detectIpCountry();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Password Match Validation
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    // 2. Security Puzzle Check
    const expectedSum = mathProblem.a + mathProblem.b;
    if (parseInt(mathAnswer.trim(), 10) !== expectedSum && !captchaVerified) {
      setErrorMsg(`Security verification failed. Please answer: What is ${mathProblem.a} + ${mathProblem.b}?`);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            primary_country: detectedCountry.code,
            country_name: detectedCountry.name,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // Save user primary country to localStorage
      localStorage.setItem('voxpolis_primary_country', detectedCountry.code);
      localStorage.setItem('voxpolis_preferred_language', 'en');

      router.push('/feed');
    } catch (e: any) {
      setErrorMsg(e.message || 'Signup failed.');
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/feed`,
        },
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'Google OAuth failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="text-center">
          <Link href="/">
            <SiteLogo variant="full" className="h-10 w-auto mx-auto mb-3" />
          </Link>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Create Voxpolis Account</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get personalized global political feeds & executive insights</p>
        </div>

        {/* IP Auto-Detected Country Badge */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-gray-900 dark:text-white">Auto-Detected Location: </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {detectedCountry.flag} {detectedCountry.name}
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded">IP Verified</span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGoogleSignup}
          type="button"
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition"
        >
          <Chrome className="w-4 h-4 text-blue-600" />
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
          <span className="bg-white dark:bg-gray-900 px-3 text-[10px] uppercase font-bold text-gray-400 absolute">
            Or register with email
          </span>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Michael Scott"
                className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>
          </div>

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

          {/* Re-enter Password Confirmation Field */}
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full text-xs p-3 pl-10 rounded-xl border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'
                }`}
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-[10px] text-red-500 mt-1 font-semibold">Passwords do not match</p>
            )}
          </div>

          {/* Captcha & Security Verification Challenge */}
          <div className="p-3.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" /> Human Security Verification
              </span>
              <span className="text-[10px] text-gray-500 font-semibold">Solve Puzzle</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-400">
                What is {mathProblem.a} + {mathProblem.b}?
              </span>
              <input
                type="number"
                required
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                placeholder="Answer"
                className="w-24 text-xs p-2 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
