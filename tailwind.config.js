// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#8B1A1A', dark: '#5C0F0F', light: '#B33030' },
        'on-primary': '#FFFFFF',
        'primary-container': '#8B1A1A',
        'on-primary-container': '#FFCDD2',
        secondary: { DEFAULT: '#0077B6', container: '#67BAFD' },
        'on-secondary': '#FFFFFF',
        tertiary: { DEFAULT: '#BC6C25', container: '#5F2F00' },
        'on-tertiary': '#FFFFFF',
        'on-tertiary-container': '#EA9147',
        sand: '#F4A261',
        mint: '#A5D0B9',
        surface: { DEFAULT: '#F8F9FA', dim: '#D9DADB', bright: '#F8F9FA' },
        'surface-container': { lowest: '#FFFFFF', low: '#F3F4F5', DEFAULT: '#EDEEEF', high: '#E7E8E9', highest: '#E1E3E4' },
        'on-surface': '#191C1D',
        'on-surface-variant': '#414844',
        outline: { DEFAULT: '#717973', variant: '#C1C8C2' },
        error: { DEFAULT: '#BA1A1A', container: '#FFDAD6' },
        'on-error': '#FFFFFF',
      },
      fontFamily: {
        'display-bold': ['PlusJakartaSans_700Bold'],
        'display-semibold': ['PlusJakartaSans_600SemiBold'],
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
