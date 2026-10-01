'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff } from 'lucide-react';

export default function NetworkErrorOverlay() {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    const handleCustomNetworkError = () => setIsOffline(true);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('voxpolis:network-error', handleCustomNetworkError);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('voxpolis:network-error', handleCustomNetworkError);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    
    // Quick probe to test connectivity
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setIsOffline(false);
          window.location.reload();
        })
        .catch(() => {
          // Fallback reload
          window.location.reload();
        })
        .finally(() => {
          setIsRetrying(false);
        });
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 700);
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0f12] text-white px-4 text-center select-none animate-fadeIn"
      style={{ minHeight: '100vh' }}
    >
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Wifi Slash Icon matching user's uploaded sample */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto flex items-center justify-center mb-4">
          <WifiOff className="w-12 h-12 sm:w-14 sm:h-14 text-gray-300 stroke-[1.5]" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
          Network error
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-gray-400 mb-6">
          Connect to the internet and try again.
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-6 py-2.5 bg-[#262a30] hover:bg-[#32363e] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 min-w-[120px]"
        >
          {isRetrying ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Try again</span>
          )}
        </button>
      </div>
    </div>
  );
}
