'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SiteLogoProps {
  variant?: 'full' | 'icon' | 'light' | 'dark';
  className?: string;
  width?: number;
  height?: number;
}

export default function SiteLogo({
  variant = 'full',
  className = 'h-9 w-auto',
  width = 180,
  height = 45,
}: SiteLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    async function loadLogos() {
      try {
        const res = await fetch('/api/site-settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (variant === 'full' && data.full_logo_url) setLogoUrl(data.full_logo_url);
            else if (variant === 'icon' && data.icon_url) setLogoUrl(data.icon_url);
            else if (variant === 'light' && data.light_logo_url) setLogoUrl(data.light_logo_url);
            else if (variant === 'dark' && data.dark_logo_url) setLogoUrl(data.dark_logo_url);
          }
        }
      } catch (e) {
        console.warn('Could not fetch dynamic logo settings, using fallback.', e);
      }
    }
    loadLogos();
  }, [variant]);

  // Default fallbacks from voxpolis-logo-kit if setting not yet returned
  const fallbackMap = {
    full: '/voxpolis-logo-kit/01-original-full-lockup.png',
    icon: '/voxpolis-logo-kit/12-transparent-icon.png',
    light: '/voxpolis-logo-kit/11-transparent-blog-header.png',
    dark: '/voxpolis-logo-kit/04-blog-header-dark.jpg',
  };

  const src = logoUrl || fallbackMap[variant];

  return (
    <div className={`relative flex items-center shrink-0 ${className}`}>
      {/* eslint-disable-next-html-element-suppression */}
      <img
        src={src}
        alt="Voxpolis Logo"
        className={`${className} object-contain transition-opacity duration-200`}
      />
    </div>
  );
}
