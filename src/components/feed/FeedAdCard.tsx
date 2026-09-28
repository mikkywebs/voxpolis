'use client';

import { Sparkles } from 'lucide-react';

export default function FeedAdCard() {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 text-white rounded-2xl p-6 border border-gray-700/60 shadow-lg text-center my-6">
      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
        <Sparkles className="w-3 h-3 inline mr-1" />
        SPONSORED FEED ADVERTISEMENT
      </span>
      <h3 className="text-base font-bold text-white mb-1">Voxpolis Political Briefing Newsletter</h3>
      <p className="text-xs text-gray-300 max-w-lg mx-auto mb-4">
        Get daily un-biased policy summaries, legislative tracking, and geopolitical insights delivered straight to your inbox.
      </p>
      <a
        href="https://voxpolis.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
      >
        Subscribe Free
      </a>
    </div>
  );
}
