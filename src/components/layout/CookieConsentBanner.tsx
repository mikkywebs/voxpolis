'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    advertising: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('voxpolis_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('voxpolis_cookie_consent', JSON.stringify({ essential: true, analytics: true, advertising: true }));
    setShowBanner(false);
  };

  const handleRejectNonEssential = () => {
    localStorage.setItem('voxpolis_cookie_consent', JSON.stringify({ essential: true, analytics: false, advertising: false }));
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('voxpolis_cookie_consent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gray-900/95 text-white border-t border-gray-800 shadow-2xl backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-3xl">
          <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <p className="font-semibold text-white mb-1">We value your privacy (GDPR Compliance)</p>
            Voxpolis uses cookies to enhance feed personalization, deliver non-intrusive political news ads, and analyze traffic. You can accept all, reject non-essential cookies, or customize your preferences anytime.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPreferences(true)}
            className="text-xs font-semibold px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition"
          >
            Preferences
          </button>
          <button
            onClick={handleRejectNonEssential}
            className="text-xs font-semibold px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={handleAcceptAll}
            className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition"
          >
            Accept All
          </button>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Cookie Preferences</h3>
              <button onClick={() => setShowPreferences(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <p className="font-semibold text-white">Essential Cookies</p>
                  <p className="text-gray-400 text-[11px]">Required for login, country preferences, and security.</p>
                </div>
                <input type="checkbox" checked disabled className="rounded text-blue-600 focus:ring-0" />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <p className="font-semibold text-white">Analytics Cookies</p>
                  <p className="text-gray-400 text-[11px]">Helps us understand article reading time and performance.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <p className="font-semibold text-white">Advertising Cookies</p>
                  <p className="text-gray-400 text-[11px]">Enables AdSense and Monetag ad unit display.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.advertising}
                  onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={handleSavePreferences}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 font-semibold text-xs rounded-xl shadow transition"
              >
                Save Choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
