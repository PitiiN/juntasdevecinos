/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF0FF',
          100: '#D6E0FF',
          200: '#ADC1FF',
          300: '#85A3FF',
          400: '#5C84FF',
          500: '#2563EB',
          600: '#1E50C8',
          700: '#1A3F9E',
          800: '#1E3A5F',
          900: '#0F172A',
        },
        accent: {
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontSize: {
        'acc-sm': ['16px', '24px'],
        'acc-base': ['18px', '28px'],
        'acc-lg': ['20px', '30px'],
        'acc-xl': ['24px', '32px'],
        'acc-2xl': ['28px', '36px'],
        'acc-3xl': ['32px', '40px'],
      },
    },
  },
  plugins: [],
};
