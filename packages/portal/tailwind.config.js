// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50, #e3f2fd)',
          100: 'var(--color-primary-100, #bbdefb)',
          200: 'var(--color-primary-200, #90caf9)',
          300: 'var(--color-primary-300, #64b5f6)',
          400: 'var(--color-primary-400, #42a5f5)',
          500: 'var(--color-primary-500, #2196f3)',
          600: 'var(--color-primary-600, #1976d2)',
          700: 'var(--color-primary-700, #1565c0)',
          800: 'var(--color-primary-800, #0d47a1)',
          900: 'var(--color-primary-900, #0a3a8a)',
        },
      },
    },
  },
  plugins: [],
};
