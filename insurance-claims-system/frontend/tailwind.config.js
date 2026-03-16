/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8edf4',
          100: '#c5d0e3',
          200: '#9eb2d0',
          300: '#7794bd',
          400: '#597daf',
          500: '#3b66a1',
          600: '#1E3A5F',
          700: '#1a3354',
          800: '#152b48',
          900: '#0f1f34',
        },
        accent: {
          50: '#faf6ed',
          100: '#f2e8d0',
          200: '#e9d8b0',
          300: '#e0c890',
          400: '#D4A843',
          500: '#c9982e',
          600: '#b08425',
          700: '#8e6b1e',
          800: '#6d5217',
          900: '#4b3810',
        },
      },
    },
  },
  plugins: [],
};
