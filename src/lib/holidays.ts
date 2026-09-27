export interface HolidayInfo {
  name: string;
  greeting: string;
  icon: string;
}

export function getHolidayForDateAndCountry(countryCode: string, date: Date = new Date()): HolidayInfo | null {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Global Holidays
  if (month === 1 && day === 1) {
    return {
      name: "New Year's Day",
      greeting: '🎉 Happy New Year! Wishing you peace and insightful news in 2026.',
      icon: '🎆',
    };
  }

  if (month === 12 && (day === 24 || day === 25)) {
    return {
      name: 'Christmas',
      greeting: '🎄 Merry Christmas & Happy Holidays from Vospolis!',
      icon: '🎁',
    };
  }

  if (month === 12 && day === 31) {
    return {
      name: "New Year's Eve",
      greeting: '🥂 Happy New Year’s Eve! Here’s to a historic year ahead.',
      icon: '✨',
    };
  }

  // Country-Specific Major Holidays
  const countryUpper = countryCode.toUpperCase();

  if (countryUpper === 'US' && month === 7 && day === 4) {
    return {
      name: 'Independence Day',
      greeting: '🎆 Happy 4th of July! Celebrating US Independence Day.',
      icon: '🇺🇸',
    };
  }

  if (countryUpper === 'NO' && month === 5 && day === 17) {
    return {
      name: 'Constitution Day',
      greeting: '🇳🇴 Gratulerer med dagen! Celebrating Norway Constitution Day.',
      icon: '🇳🇴',
    };
  }

  if (countryUpper === 'FR' && month === 7 && day === 14) {
    return {
      name: 'Bastille Day',
      greeting: '🇫🇷 Bonne Fête Nationale! Happy Bastille Day.',
      icon: '🇫🇷',
    };
  }

  if (countryUpper === 'CA' && month === 7 && day === 1) {
    return {
      name: 'Canada Day',
      greeting: '🇨🇦 Happy Canada Day!',
      icon: '🍁',
    };
  }

  if (countryUpper === 'DE' && month === 10 && day === 3) {
    return {
      name: 'German Unity Day',
      greeting: '🇩🇪 Alles Gute zum Tag der Deutschen Einheit!',
      icon: '🇩🇪',
    };
  }

  if (countryUpper === 'JP' && month === 2 && day === 11) {
    return {
      name: 'National Foundation Day',
      greeting: '🇯🇵 Happy National Foundation Day (Kenkoku Kinen no Hi)!',
      icon: '🌸',
    };
  }

  if (countryUpper === 'ZA' && month === 4 && day === 27) {
    return {
      name: 'Freedom Day',
      greeting: '🇿🇦 Happy Freedom Day, South Africa!',
      icon: '🇿🇦',
    };
  }

  if (countryUpper === 'NG' && month === 10 && day === 1) {
    return {
      name: 'Independence Day',
      greeting: '🇳🇬 Happy Independence Day, Nigeria!',
      icon: '🇳🇬',
    };
  }

  if (countryUpper === 'GH' && month === 3 && day === 6) {
    return {
      name: 'Independence Day',
      greeting: '🇬🇭 Happy Independence Day, Ghana!',
      icon: '🇬🇭',
    };
  }

  if (countryUpper === 'ES' && month === 10 && day === 12) {
    return {
      name: 'Fiesta Nacional de España',
      greeting: '🇪🇸 ¡Feliz Día de la Fiesta Nacional de España!',
      icon: '🇪🇸',
    };
  }

  return null;
}
