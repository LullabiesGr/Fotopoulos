/** @type {import('tailwindcss').Config} */
export default {
  // ενεργοποίηση dark mode με class στο <html>
  darkMode: 'class',

  // σκάναρε όλα τα αρχεία του UI
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // ήπια εμφάνιση για modals/cards
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // μπορείς να χρησιμοποιείς class: animate-fadeIn
        fadeIn: 'fadeIn .2s ease both',
      },
    },
  },

  plugins: [],
};
