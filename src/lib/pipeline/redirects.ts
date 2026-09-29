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
  const rec = redirectRegistry.get(oldSlug);
  return rec ? rec.new_slug : null;
}

export function getAllRedirects(): RedirectRecord[] {
  return Array.from(redirectRegistry.values());
}
