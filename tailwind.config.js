/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#DEDBC8',
        ink: '#07080D',
        panel: '#11131A',
        cyan: '#55F2EA',
        violet: '#8E7CFF',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(85, 242, 234, .16), 0 0 36px rgba(85, 242, 234, .08)',
      },
    },
  },
  plugins: [],
}
