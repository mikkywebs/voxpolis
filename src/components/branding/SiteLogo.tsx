'use client';

import { useState, useEffect } from 'react';

interface SiteLogoProps {
  variant?: 'full' | 'icon' | 'light' | 'dark';
  className?: string;
  width?: number;
  height?: number;
}

export default function SiteLogo({
  variant = 'full',
  className = 'h-9 w-auto',
}: SiteLogoProps) {
  const [settings, setSettings] = useState<{
    light_logo_url?: string;
    dark_logo_url?: string;
    icon_url?: string;
    full_logo_url?: string;
  }>({});

  useEffect(() => {
    async function loadLogos() {
      try {
        const res = await fetch('/api/site-settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSettings(data);
          }
        }
      } catch (e) {
        console.warn('Could not fetch dynamic logo settings, using fallback.', e);
      }
    }
    loadLogos();
  }, []);

  const sanitizeLogoUrl = (url?: string, fallback: string = ''): string => {
    if (!url || url.includes('/voxpolis-logo-kit/') || url.endsWith('.jpg')) {
      return fallback;
    }
    return url;
  };

  const defaultLight = sanitizeLogoUrl(settings.light_logo_url, '/voxpolis-logo-light.png');
  const defaultDark = sanitizeLogoUrl(settings.dark_logo_url, '/voxpolis-logo-dark.png');
  const defaultIcon = sanitizeLogoUrl(settings.icon_url, '/voxpolis-icon.png');

  if (variant === 'icon') {
    return (
      <div className={`relative flex items-center shrink-0 ${className}`}>
        {/* eslint-disable-next-html-element-suppression */}
        <img
          src={defaultIcon}
          alt="Voxpolis Icon"
          className={`${className} object-contain`}
        />
      </div>
    );
  }

  if (variant === 'light') {
    return (
      <div className={`relative flex items-center shrink-0 ${className}`}>
        {/* eslint-disable-next-html-element-suppression */}
        <img
          src={defaultLight}
          alt="Voxpolis Logo"
          className={`${className} object-contain`}
        />
      </div>
    );
  }

  if (variant === 'dark') {
    return (
      <div className={`relative flex items-center shrink-0 ${className}`}>
        {/* eslint-disable-next-html-element-suppression */}
        <img
          src={defaultDark}
          alt="Voxpolis Logo"
          className={`${className} object-contain`}
        />
      </div>
    );
  }

  // variant === 'full' responds automatically to light and dark theme
  return (
    <div className={`relative flex items-center shrink-0 ${className}`}>
      {/* Light Mode Logo: Visible in light mode, hidden in dark mode */}
      {/* eslint-disable-next-html-element-suppression */}
      <img
        src={defaultLight}
        alt="Voxpolis Logo"
        className={`${className} object-contain dark:hidden`}
      />
      {/* Dark Mode Logo: Visible in dark mode, hidden in light mode */}
      {/* eslint-disable-next-html-element-suppression */}
      <img
        src={defaultDark}
        alt="Voxpolis Logo"
        className={`${className} object-contain hidden dark:block`}
      />
    </div>
  );
}
