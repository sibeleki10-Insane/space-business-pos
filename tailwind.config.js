/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4ec',
          100: '#fbe5cc',
          200: '#f6c998',
          300: '#f0a85c',
          400: '#e98730',
          500: '#d97b35',
          600: '#c4621c',
          700: '#a34d18',
          800: '#853d16',
          900: '#6c3213',
        },
      },
    },
  },
  plugins: [],
}
