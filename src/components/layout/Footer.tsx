'use client';

import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-gray-400 border-t border-gray-800 py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
        {/* Centered App Logo */}
        <Link href="/" className="inline-block hover:opacity-90 transition">
          <SiteLogo variant="dark" className="h-12 sm:h-14 w-auto mx-auto" />
        </Link>

        {/* Footer Navigation Links for All Trust Pages (Historical Archive link removed per request) */}
        <nav className="flex items-center justify-center flex-wrap gap-5 text-xs font-semibold text-gray-300">
          <Link href="/" className="hover:text-blue-400 transition">
            Home
          </Link>
          <Link href="/about" className="hover:text-blue-400 transition">
            About Us
          </Link>
          <Link href="/contact" className="hover:text-blue-400 transition">
            Contact Us
          </Link>
          <Link href="/privacy" className="hover:text-blue-400 transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-400 transition">
            Terms of Service
          </Link>
        </nav>

        {/* Copyright */}
        <div className="text-[11px] text-gray-500 max-w-md">
          <p>© {new Date().getFullYear()} Voxpolis. Independent Global Political Journalism.</p>
        </div>
      </div>
    </footer>
  );
}
