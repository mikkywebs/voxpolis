'use client';

import { useState } from 'react';
import { X, ChevronUp, Sparkles } from 'lucide-react';

export default function StickyFooterAd() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center p-2 pointer-events-none">
      <div className="pointer-events-auto bg-gray-900/90 dark:bg-black/90 text-white border border-gray-700/60 rounded-2xl shadow-2xl backdrop-blur-md max-w-2xl w-full transition-all duration-300">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
          <span className="flex items-center gap-1 text-amber-400">
            <Sparkles className="w-3 h-3" /> SPONSORED ADVERTISEMENT
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:text-white transition"
              title={isCollapsed ? 'Expand Ad' : 'Collapse Ad'}
            >
              <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={() => setIsDismissed(true)} className="hover:text-white transition" title="Close Ad">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 text-center">
            {/* Ad Unit Container for AdSense / Monetag */}
            <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-gray-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border border-gray-700/50">
              <div className="text-left">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  FEATURED SPONSOR
                </span>
                <p className="text-xs font-bold text-white mt-1">Global Political Intelligence Digest 2026</p>
                <p className="text-[11px] text-gray-400">Stay informed on policy shifts and international trade updates.</p>
              </div>
              <a
                href="https://vospolis.app"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition"
              >
                Learn More
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
