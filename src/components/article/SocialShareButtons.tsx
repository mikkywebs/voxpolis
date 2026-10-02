'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Send } from 'lucide-react';

interface SocialShareButtonsProps {
  title: string;
  slug: string;
}

export default function SocialShareButtons({ title, slug }: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/news/${slug}`
    : `https://voxpolis.app/news/${slug}`;

  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareLinks = [
    {
      name: 'X (Twitter)',
      icon: '𝕏',
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      bgColor: 'bg-black text-white hover:bg-gray-800',
    },
    {
      name: 'Facebook',
      icon: 'f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgColor: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      bgColor: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
    {
      name: 'LinkedIn',
      icon: 'in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bgColor: 'bg-blue-700 text-white hover:bg-blue-800',
    },
    {
      name: 'Telegram',
      icon: '✈',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      bgColor: 'bg-sky-500 text-white hover:bg-sky-600',
    },
  ];

  return (
    <div className="my-4 p-3 bg-gray-100/80 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
        <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Share Report:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${link.name}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 ${link.bgColor}`}
          >
            <span className="text-sm leading-none">{link.icon}</span>
            <span className="hidden sm:inline">{link.name}</span>
          </a>
        ))}

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition shadow-sm flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );
}
