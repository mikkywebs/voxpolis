/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vospolis: {
          navy: '#0f172a',
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            500: '#2563eb',
            600: '#1d4ed8',
            700: '#1e40af',
            800: '#1e3a8a',
            900: '#172554',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
          },
        },
      },
    },
  },
  plugins: [],
}
