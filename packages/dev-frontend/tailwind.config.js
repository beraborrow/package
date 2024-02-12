/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'main-gradient': 'linear-gradient(175deg, #14095A 4.86%, #140E2E 25.8%, #150E2F)',
        'orange-gradient': 'linear-gradient(180deg, #FDBF47 0%, #EA340C 100%)',
        'bear': 'url("/imgs/background.png")'
      },
      colors: {
        "dark-gray": "#FFEDD4"
      }
    },
  },
  plugins: [],
}

