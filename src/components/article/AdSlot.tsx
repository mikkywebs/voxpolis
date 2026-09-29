'use client';

import { useEffect, useState } from 'react';

interface AdSlotProps {
  slotLocation: 'below_dek' | 'mid_article' | 'below_sources';
  isAllowed?: boolean;
}

export default function AdSlot({ slotLocation, isAllowed = true }: AdSlotProps) {
  const [adClient, setAdClient] = useState<string | null>(null);

  useEffect(() => {
    // Check if publisher ID is configured or present in env
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || 'ca-pub-0000000000000000';
    setAdClient(pubId);
  }, []);

  if (!isAllowed) return null;

  return (
    <div className="my-6 py-3 px-4 rounded-xl bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        ADVERTISEMENT
      </div>
      {/* Responsive Google AdSense Container */}
      <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
        {adClient ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', textAlign: 'center' }}
            data-ad-client={adClient}
            data-ad-slot={
              slotLocation === 'below_dek'
                ? '1000000001'
                : slotLocation === 'mid_article'
                ? '1000000002'
                : '1000000003'
            }
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div className="text-xs text-gray-400 italic">Sponsored Coverage Slot</div>
        )}
      </div>
    </div>
  );
}
