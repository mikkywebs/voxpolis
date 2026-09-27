export interface WeatherData {
  tempC: number;
  tempF: number;
  weatherCode: number;
  condition: string;
  icon: string;
}

export async function fetchWeatherForCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current_weather;
    if (!current) return null;

    const code = current.weathercode;
    const tempC = Math.round(current.temperature);
    const tempF = Math.round((tempC * 9) / 5 + 32);

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

    return {
      tempC,
      tempF,
      weatherCode: code,
      condition,
      icon,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}
