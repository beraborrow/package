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
        'bear': 'url("/imgs/background.png")',
        'simple': 'url("/imgs/simple.png")',
        'den': 'url("/imgs/den.png")',
      },
      backgroundPosition: {
        "bottom-10": "center bottom 10vh",
        "bottom-15": "center bottom 15vh",
        "bottom-20": "center bottom 30vh",
        "top-center-14": 'center top -14px'
      },
      colors: {
        "dark-gray": "#FFEDD4",
        "gray-black": "#111",
        "dark-orange": "#AF8765"
      },
      space: {
        "trove-lg": "calc(50vw - 100px)"
      },
      width: {
        "trove-lg": "min(calc(50% - 100px), 620px)",
        "screen-1/2": "50vw"
      },
      height: {
        "screen-100": "calc(100vh - 100px)",
      },
      maxWidth: {
        "8xl": "1440px",
        "400px": "400px",
        "500px": "500px"
      },
      minWidth: {
        "trove-lg": "min(calc(50% - 100px), 620px)",
        "250px": "250px"
      },
      minHeight: {
        "lg": "600px"
      },
      fontSize: {
        "4.5xl": "40px"
      },
      letterSpacing: {
        "tight": "-1.2px"
      },
      spacing: {
        "14px": "14px",
        "30px": "30px",
        "55px": "55px",
        "25": "100px",
        "50": "200px",
        "300px": "300px",
        "380px": "380px",
        "400px": "400px",
        "450px": "450px",
        "500px": "500px",
        "600px": "600px"
      },
      padding: {
        'px-60px': '60px',
        'pr-60px': '60px',
        'pl-60px': '60px',
        'px-128px': '128px',
        'pb-192px': '192px',
        'pb-30px': '30px',
        'pt-150px': '150px',
        'pt-30px': '30px'
      },
      keyframes: {
        slideInFromRight: {
          '0%': { right: '-100%' },
          '100%': { right: 'calc(-50% - 100px)' },
        },
        slideOutFromRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideInFromTop500: {
          '0%': { top: '2000px' },
          '100%': { top: '500px' },
        },
        slideInFromTop250: {
          '0%': { top: '2000px' },
          '100%': { top: '250px' },
        },
        slideInFromTop300: {
          '0%': { top: '2000px' },
          '100%': { top: '300px' },
        },
        slideInFromTop350: {
          '0%': { top: '2000px' },
          '100%': { top: '350px' },
        },
        slideInFromLeft: {
          '0%': { left: '-100%' },
          '100%': { left: 'calc(-50% + 100px)' },
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
        'slide-in-top-500': 'slideInFromTop500 1s ease-out forwards',
        'slide-in-top-250': 'slideInFromTop250 1s ease-out forwards',
        'slide-in-top-300': 'slideInFromTop300 1s ease-out forwards',
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

