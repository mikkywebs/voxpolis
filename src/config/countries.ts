export interface LanguageOption {
  code: string;
  name: string;
}

export type Continent = 'Africa' | 'Americas' | 'Europe' | 'Asia';

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  capital: string;
  lat: number;
  lon: number;
  continent: Continent;
  region: string;
  languages: LanguageOption[];
}

export interface RegionGroup {
  continent: Continent;
  regionName: string;
  icon: string;
  countries: CountryConfig[];
}

export const ALL_COUNTRIES: CountryConfig[] = [
  // --- AFRICA ---
  // West Africa
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', capital: 'Abuja', lat: 9.0765, lon: 7.3986, continent: 'Africa', region: 'West Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', capital: 'Accra', lat: 5.6037, lon: -0.1870, continent: 'Africa', region: 'West Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', capital: 'Dakar', lat: 14.7167, lon: -17.4677, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }, { code: 'en', name: 'English' }] },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', capital: 'Yamoussoukro', lat: 6.8276, lon: -5.2893, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }] },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', capital: 'Freetown', lat: 8.4844, lon: -13.2299, continent: 'Africa', region: 'West Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', capital: 'Monrovia', lat: 6.3005, lon: -10.7969, continent: 'Africa', region: 'West Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'GM', name: 'The Gambia', flag: '🇬🇲', capital: 'Banjul', lat: 13.4549, lon: -16.5790, continent: 'Africa', region: 'West Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', capital: 'Praia', lat: 14.9315, lon: -23.5125, continent: 'Africa', region: 'West Africa', languages: [{ code: 'pt', name: 'Portuguese' }] },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', capital: 'Conakry', lat: 9.6412, lon: -13.5784, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }] },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', capital: 'Bamako', lat: 12.6392, lon: -8.0029, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }] },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', capital: 'Ouagadougou', lat: 12.3714, lon: -1.5197, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }] },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', capital: 'Niamey', lat: 13.5116, lon: 2.1254, continent: 'Africa', region: 'West Africa', languages: [{ code: 'fr', name: 'French' }] },

  // East Africa
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', capital: 'Nairobi', lat: -1.2921, lon: 36.8219, continent: 'Africa', region: 'East Africa', languages: [{ code: 'en', name: 'English' }, { code: 'sw', name: 'Swahili' }] },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', capital: 'Kampala', lat: 0.3476, lon: 32.5825, continent: 'Africa', region: 'East Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', capital: 'Dodoma', lat: -6.1630, lon: 35.7516, continent: 'Africa', region: 'East Africa', languages: [{ code: 'sw', name: 'Swahili' }, { code: 'en', name: 'English' }] },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', capital: 'Addis Ababa', lat: 9.0300, lon: 38.7400, continent: 'Africa', region: 'East Africa', languages: [{ code: 'am', name: 'Amharic' }, { code: 'en', name: 'English' }] },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', capital: 'Kigali', lat: -1.9441, lon: 30.0619, continent: 'Africa', region: 'East Africa', languages: [{ code: 'en', name: 'English' }, { code: 'fr', name: 'French' }] },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', capital: 'Mogadishu', lat: 2.0469, lon: 45.3182, continent: 'Africa', region: 'East Africa', languages: [{ code: 'so', name: 'Somali' }] },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', capital: 'Juba', lat: 4.8594, lon: 31.5713, continent: 'Africa', region: 'East Africa', languages: [{ code: 'en', name: 'English' }] },

  // Southern Africa
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', capital: 'Pretoria', lat: -25.7479, lon: 28.2293, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }, { code: 'af', name: 'Afrikaans' }] },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', capital: 'Windhoek', lat: -22.5609, lon: 17.0658, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', capital: 'Gaborone', lat: -24.6282, lon: 25.9231, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', capital: 'Lusaka', lat: -15.3875, lon: 28.3228, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', capital: 'Harare', lat: -17.8252, lon: 31.0335, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', capital: 'Lilongwe', lat: -13.9631, lon: 33.7741, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }] },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', capital: 'Maputo', lat: -25.9692, lon: 32.5732, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'pt', name: 'Portuguese' }] },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', capital: 'Port Louis', lat: -20.1609, lon: 57.5012, continent: 'Africa', region: 'Southern Africa', languages: [{ code: 'en', name: 'English' }, { code: 'fr', name: 'French' }] },

  // Central/North Africa
  { code: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩', capital: 'Kinshasa', lat: -4.4419, lon: 15.2663, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'fr', name: 'French' }] },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', capital: 'Yaoundé', lat: 3.8480, lon: 11.5021, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'fr', name: 'French' }, { code: 'en', name: 'English' }] },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', capital: 'Cairo', lat: 30.0444, lon: 31.2357, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'en', name: 'English' }] },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', capital: 'Rabat', lat: 34.0209, lon: -6.8416, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'fr', name: 'French' }] },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', capital: 'Algiers', lat: 36.7538, lon: 3.0588, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'fr', name: 'French' }] },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', capital: 'Tunis', lat: 36.8065, lon: 10.1815, continent: 'Africa', region: 'Central/North Africa', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'fr', name: 'French' }] },

  // --- AMERICAS ---
  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', capital: 'Washington D.C.', lat: 38.8951, lon: -77.0364, continent: 'Americas', region: 'North America', languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', capital: 'Ottawa', lat: 45.4215, lon: -75.6972, continent: 'Americas', region: 'North America', languages: [{ code: 'en', name: 'English' }, { code: 'fr', name: 'French' }] },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', capital: 'Mexico City', lat: 19.4326, lon: -99.1332, continent: 'Americas', region: 'North America', languages: [{ code: 'es', name: 'Spanish' }] },

  // Central America
  { code: 'PA', name: 'Panama', flag: '🇵🇦', capital: 'Panama City', lat: 8.9824, lon: -79.5199, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', capital: 'San José', lat: 9.9281, lon: -84.0907, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', capital: 'Guatemala City', lat: 14.6349, lon: -90.5069, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', capital: 'Tegucigalpa', lat: 14.0723, lon: -87.1921, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', capital: 'San Salvador', lat: 13.6929, lon: -89.2182, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', capital: 'Managua', lat: 12.1149, lon: -86.2362, continent: 'Americas', region: 'Central America', languages: [{ code: 'es', name: 'Spanish' }] },

  // Caribbean
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', capital: 'Kingston', lat: 18.0179, lon: -76.8099, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'en', name: 'English' }] },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹', capital: 'Port of Spain', lat: 10.6549, lon: -61.5019, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'en', name: 'English' }] },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', capital: 'Nassau', lat: 25.0343, lon: -77.3963, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'en', name: 'English' }] },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', capital: 'Port-au-Prince', lat: 18.5944, lon: -72.3074, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'fr', name: 'French' }, { code: 'ht', name: 'Haitian Creole' }] },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', capital: 'Santo Domingo', lat: 18.4861, lon: -69.9312, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', capital: 'Havana', lat: 23.1136, lon: -82.3666, continent: 'Americas', region: 'Caribbean', languages: [{ code: 'es', name: 'Spanish' }] },

  // South America
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', capital: 'Brasília', lat: -15.7975, lon: -47.8919, continent: 'Americas', region: 'South America', languages: [{ code: 'pt', name: 'Portuguese' }] },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', capital: 'Buenos Aires', lat: -34.6037, lon: -58.3816, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', capital: 'Santiago', lat: -33.4489, lon: -70.6693, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', capital: 'Bogotá', lat: 4.7110, lon: -74.0721, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', capital: 'Lima', lat: -12.0464, lon: -77.0428, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', capital: 'Caracas', lat: 10.4806, lon: -66.9036, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', capital: 'Quito', lat: -0.1807, lon: -78.4678, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', capital: 'La Paz', lat: -16.4897, lon: -68.1193, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', capital: 'Asunción', lat: -25.2637, lon: -57.5759, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', capital: 'Montevideo', lat: -34.9011, lon: -56.1645, continent: 'Americas', region: 'South America', languages: [{ code: 'es', name: 'Spanish' }] },

  // --- EUROPE ---
  // Western/Northern Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', capital: 'London', lat: 51.5074, lon: -0.1278, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'en', name: 'English' }] },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', capital: 'Dublin', lat: 53.3498, lon: -6.2603, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'en', name: 'English' }, { code: 'ga', name: 'Irish' }] },
  { code: 'FR', name: 'France', flag: '🇫🇷', capital: 'Paris', lat: 48.8566, lon: 2.3522, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'fr', name: 'French' }, { code: 'en', name: 'English' }] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', capital: 'Berlin', lat: 52.5200, lon: 13.4050, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'de', name: 'German' }, { code: 'en', name: 'English' }] },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', capital: 'Amsterdam', lat: 52.3676, lon: 4.9041, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'nl', name: 'Dutch' }, { code: 'en', name: 'English' }] },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', capital: 'Brussels', lat: 50.8503, lon: 4.3517, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'nl', name: 'Dutch' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' }] },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', capital: 'Luxembourg City', lat: 49.6116, lon: 6.1319, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'fr', name: 'French' }, { code: 'de', name: 'German' }] },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', capital: 'Bern', lat: 46.9480, lon: 7.4474, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'de', name: 'German' }, { code: 'fr', name: 'French' }, { code: 'it', name: 'Italian' }] },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', capital: 'Vienna', lat: 48.2082, lon: 16.3738, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'de', name: 'German' }] },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', capital: 'Copenhagen', lat: 55.6761, lon: 12.5683, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'da', name: 'Danish' }] },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', capital: 'Oslo', lat: 59.9139, lon: 10.7522, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'no', name: 'Norwegian' }] },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', capital: 'Stockholm', lat: 59.3293, lon: 18.0686, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'sv', name: 'Swedish' }] },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', capital: 'Helsinki', lat: 60.1699, lon: 24.9384, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'fi', name: 'Finnish' }, { code: 'sv', name: 'Swedish' }] },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', capital: 'Reykjavík', lat: 64.1466, lon: -21.9426, continent: 'Europe', region: 'Western/Northern Europe', languages: [{ code: 'is', name: 'Icelandic' }] },

  // Southern Europe
  { code: 'IT', name: 'Italy', flag: '🇮🇹', capital: 'Rome', lat: 41.9028, lon: 12.4964, continent: 'Europe', region: 'Southern Europe', languages: [{ code: 'it', name: 'Italian' }] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', capital: 'Madrid', lat: 40.4168, lon: -3.7038, continent: 'Europe', region: 'Southern Europe', languages: [{ code: 'es', name: 'Spanish' }] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', capital: 'Lisbon', lat: 38.7223, lon: -9.1393, continent: 'Europe', region: 'Southern Europe', languages: [{ code: 'pt', name: 'Portuguese' }] },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', capital: 'Athens', lat: 37.9838, lon: 23.7275, continent: 'Europe', region: 'Southern Europe', languages: [{ code: 'el', name: 'Greek' }] },

  // Central/Eastern Europe
  { code: 'PL', name: 'Poland', flag: '🇵🇱', capital: 'Warsaw', lat: 52.2297, lon: 21.0122, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'pl', name: 'Polish' }] },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿', capital: 'Prague', lat: 50.0755, lon: 14.4378, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'cs', name: 'Czech' }] },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', capital: 'Budapest', lat: 47.4979, lon: 19.0402, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'hu', name: 'Hungarian' }] },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', capital: 'Bratislava', lat: 48.1486, lon: 17.1077, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'sk', name: 'Slovak' }] },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', capital: 'Bucharest', lat: 44.4323, lon: 26.1063, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'ro', name: 'Romanian' }] },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', capital: 'Sofia', lat: 42.6977, lon: 23.3219, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'bg', name: 'Bulgarian' }] },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', capital: 'Kyiv', lat: 50.4501, lon: 30.5234, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'uk', name: 'Ukrainian' }] },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', capital: 'Moscow', lat: 55.7558, lon: 37.6173, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'ru', name: 'Russian' }] },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', capital: 'Minsk', lat: 53.9006, lon: 27.5590, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'be', name: 'Belarusian' }, { code: 'ru', name: 'Russian' }] },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', capital: 'Chișinău', lat: 47.0105, lon: 28.8638, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'ro', name: 'Romanian' }] },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', capital: 'Tbilisi', lat: 41.7151, lon: 44.8271, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'ka', name: 'Georgian' }] },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', capital: 'Yerevan', lat: 40.1792, lon: 44.4991, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'hy', name: 'Armenian' }] },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', capital: 'Baku', lat: 40.4093, lon: 49.8671, continent: 'Europe', region: 'Central/Eastern Europe', languages: [{ code: 'az', name: 'Azerbaijani' }] },

  // --- ASIA ---
  // East Asia
  { code: 'CN', name: 'China', flag: '🇨🇳', capital: 'Beijing', lat: 39.9042, lon: 116.4074, continent: 'Asia', region: 'East Asia', languages: [{ code: 'zh', name: 'Chinese' }, { code: 'en', name: 'English' }] },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', capital: 'Tokyo', lat: 35.6762, lon: 139.6503, continent: 'Asia', region: 'East Asia', languages: [{ code: 'ja', name: 'Japanese' }, { code: 'en', name: 'English' }] },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', capital: 'Seoul', lat: 37.5665, lon: 126.9780, continent: 'Asia', region: 'East Asia', languages: [{ code: 'ko', name: 'Korean' }, { code: 'en', name: 'English' }] },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵', capital: 'Pyongyang', lat: 39.0392, lon: 125.7625, continent: 'Asia', region: 'East Asia', languages: [{ code: 'ko', name: 'Korean' }] },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', capital: 'Taipei', lat: 25.0330, lon: 121.5654, continent: 'Asia', region: 'East Asia', languages: [{ code: 'zh', name: 'Chinese' }] },

  // South Asia
  { code: 'IN', name: 'India', flag: '🇮🇳', capital: 'New Delhi', lat: 28.6139, lon: 77.2090, continent: 'Asia', region: 'South Asia', languages: [{ code: 'hi', name: 'Hindi' }, { code: 'en', name: 'English' }] },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', capital: 'Islamabad', lat: 33.6844, lon: 73.0479, continent: 'Asia', region: 'South Asia', languages: [{ code: 'ur', name: 'Urdu' }, { code: 'en', name: 'English' }] },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', capital: 'Dhaka', lat: 23.8103, lon: 90.4125, continent: 'Asia', region: 'South Asia', languages: [{ code: 'bn', name: 'Bengali' }] },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', capital: 'Sri Jayawardenepura Kotte', lat: 6.9271, lon: 79.8612, continent: 'Asia', region: 'South Asia', languages: [{ code: 'si', name: 'Sinhala' }, { code: 'ta', name: 'Tamil' }] },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', capital: 'Kathmandu', lat: 27.7172, lon: 85.3240, continent: 'Asia', region: 'South Asia', languages: [{ code: 'ne', name: 'Nepali' }] },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', capital: 'Kabul', lat: 34.5553, lon: 69.2075, continent: 'Asia', region: 'South Asia', languages: [{ code: 'ps', name: 'Pashto' }, { code: 'fa', name: 'Dari' }] },

  // Southeast Asia
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', capital: 'Jakarta', lat: -6.2088, lon: 106.8456, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'id', name: 'Indonesian' }] },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', capital: 'Manila', lat: 14.5995, lon: 120.9842, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'tl', name: 'Filipino' }, { code: 'en', name: 'English' }] },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', capital: 'Kuala Lumpur', lat: 3.1390, lon: 101.6869, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'ms', name: 'Malay' }, { code: 'en', name: 'English' }] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', capital: 'Singapore', lat: 1.3521, lon: 103.8198, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'en', name: 'English' }, { code: 'zh', name: 'Chinese' }] },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', capital: 'Bangkok', lat: 13.7563, lon: 100.5018, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'th', name: 'Thai' }] },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', capital: 'Hanoi', lat: 21.0285, lon: 105.8542, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'vi', name: 'Vietnamese' }] },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', capital: 'Naypyidaw', lat: 19.7633, lon: 96.0785, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'my', name: 'Burmese' }] },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', capital: 'Phnom Penh', lat: 11.5564, lon: 104.9282, continent: 'Asia', region: 'Southeast Asia', languages: [{ code: 'km', name: 'Khmer' }] },

  // Middle East
  { code: 'IL', name: 'Israel', flag: '🇮🇱', capital: 'Jerusalem', lat: 31.7683, lon: 35.2137, continent: 'Asia', region: 'Middle East', languages: [{ code: 'he', name: 'Hebrew' }, { code: 'en', name: 'English' }] },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', capital: 'Ramallah', lat: 31.9038, lon: 35.2034, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }] },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', capital: 'Riyadh', lat: 24.7136, lon: 46.6753, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }] },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', capital: 'Abu Dhabi', lat: 24.4539, lon: 54.3773, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'en', name: 'English' }] },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', capital: 'Doha', lat: 25.2854, lon: 51.5310, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'en', name: 'English' }] },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', capital: 'Tehran', lat: 35.6892, lon: 51.3890, continent: 'Asia', region: 'Middle East', languages: [{ code: 'fa', name: 'Persian' }] },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', capital: 'Baghdad', lat: 33.3152, lon: 44.3661, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'ku', name: 'Kurdish' }] },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', capital: 'Amman', lat: 31.9454, lon: 35.9284, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }] },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', capital: 'Beirut', lat: 33.8938, lon: 35.5018, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }, { code: 'fr', name: 'French' }] },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', capital: 'Ankara', lat: 39.9334, lon: 32.8597, continent: 'Asia', region: 'Middle East', languages: [{ code: 'tr', name: 'Turkish' }] },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', capital: 'Damascus', lat: 33.5138, lon: 36.2765, continent: 'Asia', region: 'Middle East', languages: [{ code: 'ar', name: 'Arabic' }] },
];

export const SUPPORTED_COUNTRIES = ALL_COUNTRIES;

// Region Groupings
export function getGroupedRegions(): RegionGroup[] {
  const groupsMap = new Map<string, CountryConfig[]>();

  ALL_COUNTRIES.forEach((c) => {
    const key = `${c.continent}___${c.region}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(c);
  });

  const iconMap: Record<string, string> = {
    'West Africa': '🌍',
    'East Africa': '🌍',
    'Southern Africa': '🌍',
    'Central/North Africa': '🌍',
    'North America': '🌎',
    'Central America': '🌎',
    'Caribbean': '🏝️',
    'South America': '🌎',
    'Western/Northern Europe': '🇪🇺',
    'Southern Europe': '🇪🇺',
    'Central/Eastern Europe': '🇪🇺',
    'East Asia': '🌏',
    'South Asia': '🌏',
    'Southeast Asia': '🌏',
    'Middle East': '🕌',
  };

  const result: RegionGroup[] = [];
  groupsMap.forEach((countries, key) => {
    const [continentStr, regionName] = key.split('___');
    result.push({
      continent: continentStr as Continent,
      regionName,
      icon: iconMap[regionName] || '🌍',
      countries,
    });
  });

  return result;
}

export function getCountryByCode(code: string): CountryConfig {
  const found = ALL_COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  if (found) return found;
  const us = ALL_COUNTRIES.find((c) => c.code === 'US');
  return us || ALL_COUNTRIES[0];
}

export function getCountrySlug(c: CountryConfig): string {
  return c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getCountryBySlug(slug: string): CountryConfig {
  const s = slug.toLowerCase();
  const found = ALL_COUNTRIES.find((c) => {
    const nameSlug = getCountrySlug(c);
    return nameSlug === s || c.code.toLowerCase() === s;
  });
  return found || getCountryByCode('US');
}
