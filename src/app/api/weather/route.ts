import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherForCoordinates } from '@/lib/weather';

// Weather for the reader's own city, from Vercel's approximate location of their connection
// (no permission pop-up, nothing stored). Falls back to Abuja when the location is unknown.
const ABUJA = { lat: 9.0765, lon: 7.3986, city: 'Abuja', country: 'Nigeria' };

function countryName(code: string | null): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function decode(v: string | null): string {
  if (!v) return '';
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.headers.get('x-vercel-ip-latitude') || '');
  const lon = parseFloat(req.headers.get('x-vercel-ip-longitude') || '');
  const known = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);

  const place = known
    ? {
        // Rounded to about 10 km, so readers in the same city share one cached forecast.
        lat: Math.round(lat * 10) / 10,
        lon: Math.round(lon * 10) / 10,
        city: decode(req.headers.get('x-vercel-ip-city')) || decode(req.headers.get('x-vercel-ip-country-region')) || '',
        country: countryName(req.headers.get('x-vercel-ip-country')),
      }
    : ABUJA;

  const weather = await fetchWeatherForCoordinates(place.lat, place.lon);
  // No live data → say so; the widget hides itself instead of showing invented numbers.
  if (!weather) return NextResponse.json({ error: 'Weather unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { capital: place.city || place.country || 'Your area', countryName: place.country, ...weather },
    // Different for each reader, so only their own browser may cache it.
    { headers: { 'Cache-Control': 'private, max-age=600' } }
  );
}
