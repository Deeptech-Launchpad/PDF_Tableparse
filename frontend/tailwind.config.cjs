/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: 'var(--bg-dark-950)',
          900: 'var(--bg-dark-900)',
          800: 'var(--bg-dark-800)',
          700: 'var(--bg-dark-700)',
          600: 'var(--bg-dark-600)',
          200: 'var(--text-dark-200)',
          300: 'var(--text-dark-300)',
          400: 'var(--text-dark-400)',
          500: 'var(--text-dark-500)',
        },
        accent: {
          blue: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          red: 'var(--accent-red)',
        }
      }
    },
  },
  plugins: [],
}
