import { NextResponse } from 'next/server';
import { fetchWeatherForCoordinates } from '@/lib/weather';
import { getCountryByCode, getCountryBySlug, ALL_COUNTRIES } from '@/config/countries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const countryParam = searchParams.get('country');
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  let lat = latStr ? parseFloat(latStr) : undefined;
  let lon = lonStr ? parseFloat(lonStr) : undefined;
  let capital = 'Capital';
  let countryName = 'Global';

  if (countryParam) {
    const matched =
      getCountryByCode(countryParam) ||
      getCountryBySlug(countryParam) ||
      ALL_COUNTRIES.find((c) => c.name.toLowerCase() === countryParam.toLowerCase());
    if (matched) {
      if (lat === undefined || isNaN(lat)) lat = matched.lat;
      if (lon === undefined || isNaN(lon)) lon = matched.lon;
      capital = matched.capital;
      countryName = matched.name;
    }
  }

  const finalLat = lat !== undefined && !isNaN(lat) ? lat : 9.0765; // Default Abuja
  const finalLon = lon !== undefined && !isNaN(lon) ? lon : 7.3986;

  const weather = await fetchWeatherForCoordinates(finalLat, finalLon);

  if (!weather) {
    return NextResponse.json({
      capital,
      countryName,
      tempC: 25,
      tempF: 77,
      weatherCode: 0,
      condition: 'Sunny',
      icon: '☀️',
      humidity: 68,
      windSpeed: 8,
      aqi: 38,
      aqiLabel: 'Good',
    });
  }

  return NextResponse.json({
    capital,
    countryName,
    ...weather,
  });
}

