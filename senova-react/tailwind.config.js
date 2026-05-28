/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:    '#1A3A5C',
        gold:    '#C9A84C',
        green:   '#1A7A4A',
        amber:   '#B8670A',
        danger:  '#C0281E',
        mist:    '#F0F4F8',
        charcoal:'#2C2C2A',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
