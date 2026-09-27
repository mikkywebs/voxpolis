import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-lg space-y-6">
        <Link href="/">
          <SiteLogo variant="full" className="h-9 w-auto mb-4" />
        </Link>

        <h1 className="text-2xl font-black">Terms of Service</h1>
        <p className="text-xs text-gray-500">Last updated: September 27, 2026</p>

        <div className="prose dark:prose-invert text-xs space-y-4 leading-relaxed">
          <p>
            Welcome to Vospolis (&quot;vospolis.app&quot;). By accessing or using our personalized political news platform, you agree to these Terms of Service.
          </p>

          <h3 className="font-bold text-sm">1. Use of Content</h3>
          <p>
            All news summaries, factual analyses, and original source citations are provided for informational and educational purposes.
          </p>

          <h3 className="font-bold text-sm">2. Comment Moderation</h3>
          <p>
            Users posting comments agree to abide by our automated moderation policy. Comments containing promotional URLs, hate speech, or harassment are automatically blocked.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Link href="/feed" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Vospolis Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
