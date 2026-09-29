'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-gray-400 border-t border-gray-800 py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
        {/* Centered App Logo */}
        <Link href="/" className="inline-block hover:opacity-90 transition">
          {/* eslint-disable-next-html-element-suppression */}
          <img
            src="/footer-logo.png"
            alt="Voxpolis Logo"
            className="h-14 sm:h-16 w-auto mx-auto object-contain"
          />
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
          <Link href="/corrections" className="hover:text-blue-400 transition">
            Corrections Policy
          </Link>
          <Link href="/privacy" className="hover:text-blue-400 transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-400 transition">
            Terms of Service
          </Link>
        </nav>

        {/* Copyright & Platform Description */}
        <div className="space-y-1 text-[11px] text-gray-500 max-w-md">
          <p>© {new Date().getFullYear()} Voxpolis. Multi-country Political News Briefs.</p>
          <p>Automated news briefs from primary source feeds. Operated from Abuja, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
