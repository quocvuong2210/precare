/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Merriweather', 'Lora', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          teal: '#345C59',
          'teal-hover': '#2D5553',
          'teal-dark': '#234442',
          'teal-light': '#E6F4F1',
          'teal-subtle': '#F0F9F8',
        },
      },
    },
  },
  plugins: [],
};
