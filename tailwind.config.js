/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          900: '#14532d'
        }
      }
    },
  },
  plugins: [],
}
