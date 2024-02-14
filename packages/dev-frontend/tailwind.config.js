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
      backgroundPosition: {
        "bottom-50": "center bottom 200px"
      },
      colors: {
        "dark-gray": "#FFEDD4"
      },
      keyframes: {
        slideInFromRight: {
          '0%': { right: '-600px' },
          '100%': { right: '0' },
        },
        slideOutFromRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideInFromTop600: {
          '0%': { top: '2000px' },
          '100%': { top: '600px' },
        },
        slideInFromTop450: {
          '0%': { top: '2000px' },
          '100%': { top: '450px' },
        },
        slideInFromTop400: {
          '0%': { top: '2000px' },
          '100%': { top: '400px' },
        },
        slideInFromTop350: {
          '0%': { top: '2000px' },
          '100%': { top: '350px' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeBiggerBear: {
          '0%': { scale: '85%' },
          '100%': { scale: '100%' },
        },
        fadeSmallerBear: {
          '0%': { scale: '100%' },
          '100%': { scale: '85%' },
        },
        fadeBiggerFish: {
          '0%': { scale: '100%' },
          '100%': { scale: '115%' },
        },
        fadeSmallerFish: {
          '0%': { scale: '115%' },
          '100%': { scale: '100%' },
        },
        fadeShow: {
          '0%': { opacity: '0', visibility: 'hidden' },
          '1%': { opacity: '0', visibility: 'visible' },
          '100%': { opacity: '1', visibility: 'visible' },
        },
        fadeHide: {
          '0%': { visibility: 'visible' },
          '100%': { visibility: 'hidden' },
        },
      },
      animation: {
        'slide-in-right': 'slideInFromRight 1s ease-out forwards',
        'slide-out-right': 'slideOutFromRight 1s ease-out forwards',
        'slide-in-left': 'slideInFromLeft 1s ease-out forwards',
        'slide-in-top-600': 'slideInFromTop600 1s ease-out forwards',
        'slide-in-top-450': 'slideInFromTop450 1s ease-out forwards',
        'slide-in-top-400': 'slideInFromTop400 1s ease-out forwards',
        'slide-in-top-350': 'slideInFromTop350 1s ease-out forwards',
        'fade-bigger-bear': 'fadeBiggerBear 1s ease-out forwards',
        'fade-smaller-bear': 'fadeSmallerBear 1s ease-out forwards',
        'fade-bigger-fish': 'fadeBiggerFish 1s ease-out forwards',
        'fade-smaller-fish': 'fadeSmallerFish 1s ease-out forwards',
        'fade-show': 'fadeShow 1s ease-out forwards',
        'fade-hide': 'fadeHide 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}

