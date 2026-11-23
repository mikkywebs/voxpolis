export type AqiLevel = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export interface WeatherData {
  tempC: number;
  tempF: number;
  weatherCode: number;
  isDay: boolean;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  aqi?: number;
  aqiLabel?: string;
  aqiLevel?: AqiLevel;
  observedAt?: string; // local time at the location, "HH:MM"
}

/** WMO weather codes (Open-Meteo), with day and night versions. */
function describe(code: number, isDay: boolean): { condition: string; icon: string } {
  if (code === 0) return isDay ? { condition: 'Sunny', icon: '☀️' } : { condition: 'Clear', icon: '🌙' };
  if (code === 1) return isDay ? { condition: 'Mostly sunny', icon: '🌤️' } : { condition: 'Mostly clear', icon: '🌙' };
  if (code === 2) return isDay ? { condition: 'Partly cloudy', icon: '⛅' } : { condition: 'Partly cloudy', icon: '☁️' };
  if (code === 3) return { condition: 'Cloudy', icon: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Fog', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { condition: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '🌨️' };
  if (code >= 80 && code <= 82) return { condition: 'Rain showers', icon: '🌦️' };
  if (code === 85 || code === 86) return { condition: 'Snow showers', icon: '🌨️' };
  if (code >= 95) return { condition: 'Thunderstorm', icon: '⛈️' };
  return { condition: 'Cloudy', icon: '☁️' };
}

/** US AQI bands (EPA). */
function aqiBand(aqi: number): { label: string; level: AqiLevel } {
  if (aqi <= 50) return { label: 'Good', level: 'good' };
  if (aqi <= 100) return { label: 'Moderate', level: 'moderate' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', level: 'sensitive' };
  if (aqi <= 200) return { label: 'Unhealthy', level: 'unhealthy' };
  if (aqi <= 300) return { label: 'Very unhealthy', level: 'very_unhealthy' };
  return { label: 'Hazardous', level: 'hazardous' };
}

/** Live conditions from Open-Meteo. Returns null when the service can't be reached: never made-up numbers. */
export async function fetchWeatherForCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const forecastPromise = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`,
      { next: { revalidate: 900 } } // 15 minutes
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const aqiPromise = fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`, {
      next: { revalidate: 1800 },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [forecastData, aqiData] = await Promise.all([forecastPromise, aqiPromise]);
    const current = forecastData?.current;
    if (!current || current.temperature_2m == null || current.weather_code == null) return null;

    const code = Number(current.weather_code);
    const isDay = current.is_day == null ? true : current.is_day === 1;
    const tempC = Math.round(current.temperature_2m);
    const { condition, icon } = describe(code, isDay);
    const aqiRaw = aqiData?.current?.us_aqi;
    const aqi = aqiRaw != null ? Math.round(aqiRaw) : undefined;
    const band = aqi != null ? aqiBand(aqi) : undefined;

    return {
      tempC,
      tempF: Math.round((tempC * 9) / 5 + 32),
      weatherCode: code,
      isDay,
      condition,
      icon,
      humidity: current.relative_humidity_2m != null ? Math.round(current.relative_humidity_2m) : undefined,
      windSpeed: current.wind_speed_10m != null ? Math.round(current.wind_speed_10m) : undefined,
      aqi,
      aqiLabel: band?.label,
      aqiLevel: band?.level,
      observedAt: typeof current.time === 'string' ? current.time.slice(11, 16) : undefined,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}
