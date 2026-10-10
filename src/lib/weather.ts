export interface WeatherData {
  tempC: number;
  tempF: number;
  weatherCode: number;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  aqi?: number;
  aqiLabel?: string;
}

export async function fetchWeatherForCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const forecastPromise = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    const aqiPromise = fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    const [forecastData, aqiData] = await Promise.all([forecastPromise, aqiPromise]);

    if (!forecastData || !forecastData.current) return null;

    const current = forecastData.current;
    const code = current.weather_code ?? 0;
    const tempC = Math.round(current.temperature_2m ?? 22);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const humidity = current.relative_humidity_2m != null ? Math.round(current.relative_humidity_2m) : 65;
    const windSpeed = current.wind_speed_10m != null ? Math.round(current.wind_speed_10m) : 8;

    let condition = 'Clear';
    let icon = '☀️';

    if (code === 0) {
      condition = 'Sunny';
      icon = '☀️';
    } else if (code >= 1 && code <= 3) {
      condition = 'Partly Cloudy';
      icon = '⛅';
    } else if (code >= 45 && code <= 48) {
      condition = 'Foggy';
      icon = '🌫️';
    } else if (code >= 51 && code <= 67) {
      condition = 'Rainy';
      icon = '🌧️';
    } else if (code >= 71 && code <= 77) {
      condition = 'Snowy';
      icon = '❄️';
    } else if (code >= 80 && code <= 82) {
      condition = 'Showers';
      icon = '🌦️';
    } else if (code >= 95) {
      condition = 'Thunderstorm';
      icon = '🌩️';
    }

    const aqi = aqiData?.current?.us_aqi != null ? Math.round(aqiData.current.us_aqi) : 42;
    let aqiLabel = 'Good';
    if (aqi > 150) aqiLabel = 'Unhealthy';
    else if (aqi > 100) aqiLabel = 'Poor';
    else if (aqi > 50) aqiLabel = 'Moderate';

    return {
      tempC,
      tempF,
      weatherCode: code,
      condition,
      icon,
      humidity,
      windSpeed,
      aqi,
      aqiLabel,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

