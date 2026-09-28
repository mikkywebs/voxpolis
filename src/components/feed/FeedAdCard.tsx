'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, Send, Bell } from 'lucide-react';

interface FeedAdCardProps {
  countryCode?: string;
  countryName?: string;
}

export default function FeedAdCard({ countryCode = 'NG', countryName = 'Nigeria' }: FeedAdCardProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setLoading(true);
    setTimeout(() => {
      // Save subscription in localStorage
      localStorage.setItem(`voxpolis_newsletter_${countryCode}`, email);
      setLoading(false);
      setSubscribed(true);
    }, 600);
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 text-white rounded-2xl p-6 border border-gray-700/60 shadow-lg my-6 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-500/40 text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-3">
        <Bell className="w-3 h-3 text-amber-400 animate-bounce" />
        <span>Country Briefing Alert ({countryName})</span>
      </div>

      <h3 className="text-base sm:text-lg font-black text-white mb-1">
        Subscribe to {countryName} Political News Alerts
      </h3>
      <p className="text-xs text-gray-300 max-w-md mx-auto mb-5 leading-relaxed">
        Get direct breaking reports, legislative updates, and policy analysis for {countryName} delivered straight to your inbox daily. Zero spam.
      </p>

      {subscribed ? (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 rounded-xl text-xs font-bold inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Subscribed! You will receive daily political briefings for {countryName}.</span>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
          <div className="relative w-full">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`Enter email for ${countryName} news...`}
              className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{loading ? 'Subscribing...' : 'Subscribe Free'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
