/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#111118',
        card: '#16161f',
        border: '#2a2a3a',
        accent: '#7c6fff',
        'accent-green': '#00d4aa',
        'accent-red': '#ff6b6b',
        'accent-yellow': '#ffb347',
        text: '#e8e8f0',
        muted: '#6b6b85',
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
