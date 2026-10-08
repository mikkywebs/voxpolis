'use client';

import Link from 'next/link';
import { ExternalLink, Globe } from 'lucide-react';

interface OriginalSourceLinkProps {
  sourceName: string;
  sourceUrl: string;
}

export default function OriginalSourceLink({ sourceName, sourceUrl }: OriginalSourceLinkProps) {
  if (!sourceUrl || sourceUrl === '#') return null;

  const isVoxpolisSource =
    sourceName.toLowerCase().includes('voxpolis') ||
    sourceUrl.toLowerCase().includes('voxpolis.app') ||
    sourceUrl.startsWith('/');

  return (
    <div className="pt-6 pb-12 text-center border-t border-gray-200 dark:border-gray-800 my-8">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Original news reporting credited to{' '}
        {isVoxpolisSource ? (
          <Link
            href="/"
            className="font-medium text-gray-700 dark:text-gray-300 underline hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
          >
            <span>{sourceName || 'Voxpolis'}</span>
            <Globe className="w-3 h-3 text-blue-500" />
          </Link>
        ) : (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 dark:text-gray-300 underline hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
          >
            <span>{sourceName}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </p>
    </div>
  );
}
