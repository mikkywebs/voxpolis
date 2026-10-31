'use client';

import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import { COVERED_COUNTRY_CODES } from '@/config/coverage';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-gray-400 border-t border-gray-800 py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
        {/* Centered App Logo */}
        <Link href="/" className="inline-block hover:opacity-90 transition">
          <SiteLogo variant="dark" className="h-12 sm:h-14 w-auto mx-auto" />
        </Link>

        {/* Country pages: one crawlable link to each covered country (helps Google find every country page). */}
        <nav aria-labelledby="footer-countries" className="space-y-2 max-w-4xl">
          <h2 id="footer-countries" className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">
            Political news by country
          </h2>
          <ul className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
            {COVERED_COUNTRY_CODES.map((code) => {
              const c = getCountryByCode(code);
              return (
                <li key={code}>
                  <Link href={`/${getCountrySlug(c)}`} title={`${c.name} political news`} className="hover:text-blue-400 transition">
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Navigation Links for All Trust Pages (Historical Archive link removed per request) */}
        <nav className="flex items-center justify-center flex-wrap gap-5 text-xs font-semibold text-gray-300">
          <Link href="/" className="hover:text-blue-400 transition">
            Home
          </Link>
          <Link href="/about" className="hover:text-blue-400 transition">
            About Us
          </Link>
          <Link href="/how-we-report" className="hover:text-blue-400 transition">
            How We Report
          </Link>
          <Link href="/corrections" className="hover:text-blue-400 transition">
            Corrections
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
