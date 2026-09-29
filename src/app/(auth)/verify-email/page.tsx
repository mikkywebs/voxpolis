'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowRight, CheckCircle2, RefreshCw, LogIn } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your registered email';
  const supabase = createClient();

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email || email === 'your registered email') return;
    setResending(true);
    setResendStatus(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setResendStatus(`Error: ${error.message}`);
      } else {
        setResendStatus('Verification link resent successfully! Please check your inbox.');
      }
    } catch (e: any) {
      setResendStatus('Failed to resend email. Please try again.');
    }
    setResending(false);
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl text-center">
      <Link href="/">
        <SiteLogo variant="full" className="h-10 w-auto mx-auto mb-3" />
      </Link>

      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
        <Mail className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
          Verify Your Email Address
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          We have sent an official verification link to:
        </p>
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-xs text-blue-600 dark:text-blue-400 break-all">
          {email}
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 text-left text-xs space-y-2 text-gray-600 dark:text-gray-300">
        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Next Steps:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
          <li>Open your email inbox.</li>
          <li>Look for the confirmation message from <strong>Supabase / Voxpolis</strong>.</li>
          <li>Click the <strong>Confirm email address</strong> link.</li>
          <li>If you do not see it, check your <strong>Spam / Junk</strong> folder.</li>
        </ol>
      </div>

      {resendStatus && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${resendStatus.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {resendStatus}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          <span>Open Email Inbox</span>
          <ArrowRight className="w-4 h-4" />
        </a>

        <div className="flex items-center justify-between text-xs pt-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Resending...' : 'Resend Email'}</span>
          </button>

          <Link
            href="/login"
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Proceed to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-xs text-gray-500">Loading confirmation page...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
