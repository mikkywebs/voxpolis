import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-lg space-y-6">
        <Link href="/">
          <SiteLogo variant="full" className="h-9 w-auto mb-4" />
        </Link>

        <h1 className="text-2xl font-black">Privacy Policy & GDPR Compliance</h1>
        <p className="text-xs text-gray-500">Last updated: September 27, 2026</p>

        <div className="prose dark:prose-invert text-xs space-y-4 leading-relaxed">
          <p>
            Vospolis (&quot;vospolis.app&quot;) is committed to protecting your personal data and upholding GDPR, CCPA, and global privacy standards.
          </p>

          <h3 className="font-bold text-sm">1. Data We Collect</h3>
          <p>
            We collect minimal account information (email, name, primary country preference) for logged-in users, and non-essential analytical cookies only upon explicit user consent.
          </p>

          <h3 className="font-bold text-sm">2. Cookies & Advertising</h3>
          <p>
            Non-essential cookies for Google AdSense and Monetag advertisement units are blocked until you click &quot;Accept All&quot; or select Advertising in Cookie Preferences.
          </p>

          <h3 className="font-bold text-sm">3. Moderation & User Conduct</h3>
          <p>
            Public comments are scanned using automated filtering for URLs, severe hate speech, and profanity.
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
