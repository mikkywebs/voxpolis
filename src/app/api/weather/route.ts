import { NextResponse } from 'next/server';
import { fetchWeatherForCoordinates } from '@/lib/weather';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  const lat = latStr ? parseFloat(latStr) : 38.8951; // Default US capital lat
  const lon = lonStr ? parseFloat(lonStr) : -77.0364; // Default US capital lon

  const weather = await fetchWeatherForCoordinates(lat, lon);

  if (!weather) {
    return NextResponse.json({
      tempC: 22,
      tempF: 72,
      weatherCode: 0,
      condition: 'Sunny',
      icon: '☀️',
    });
  }

  return NextResponse.json(weather);
}
