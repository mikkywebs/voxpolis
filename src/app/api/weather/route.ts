import { NextResponse } from 'next/server';
import { fetchWeatherForCoordinates } from '@/lib/weather';

// Voxpolis shows one weather location: Abuja. (Africa and World are regions, not places.)
const ABUJA = { lat: 9.0765, lon: 7.3986, capital: 'Abuja', countryName: 'Nigeria' };

export async function GET() {
  const weather = await fetchWeatherForCoordinates(ABUJA.lat, ABUJA.lon);
  // No live data → say so; the widget hides itself instead of showing invented numbers.
  if (!weather) return NextResponse.json({ error: 'Weather unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(
    { capital: ABUJA.capital, countryName: ABUJA.countryName, ...weather },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' } }
  );
}
