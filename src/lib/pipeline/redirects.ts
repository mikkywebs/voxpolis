import { RedirectRecord } from './types';

const redirectRegistry = new Map<string, RedirectRecord>();

export function register301Redirect(oldSlug: string, newSlug: string) {
  if (oldSlug && newSlug && oldSlug !== newSlug) {
    redirectRegistry.set(oldSlug, {
      old_slug: oldSlug,
      new_slug: newSlug,
      created_at: new Date().toISOString(),
    });
  }
}

export function get301Redirect(oldSlug: string): string | null {
  if (!oldSlug) return null;
  const rec = redirectRegistry.get(oldSlug);
  if (rec) return rec.new_slug;
  // If slug ends with a legacy numeric suffix like -7 or -0, redirect cleanly to canonical slug
  if (/-\d+$/.test(oldSlug)) {
    return oldSlug.replace(/-\d+$/, '');
  }
  return null;
}

export function getAllRedirects(): RedirectRecord[] {
  return Array.from(redirectRegistry.values());
}
