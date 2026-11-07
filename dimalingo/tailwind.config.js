/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cairo"', '"Nunito"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        duo: {
          green: '#58CC02',
          greenDark: '#46A302',
          greenLight: '#D7FFB8',
          blue: '#1CB0F6',
          blueDark: '#1899D6',
          blueLight: '#DDF4FF',
          gold: '#FFC800',
          goldDark: '#E5A500',
          goldLight: '#FFF5D1',
          red: '#FF4B4B',
          redDark: '#EA2B2B',
          redLight: '#FFDFE0',
          purple: '#CE82FF',
          purpleDark: '#A560E8',
          orange: '#FF9600',
          orangeDark: '#CD7900',
          nightBg: '#131F24',
          nightCard: '#1B2B34',
          nightSubtle: '#223642',
          nightBorder: '#37464F',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)', opacity: '0.6' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        shake: 'shake 0.4s ease-in-out',
        pop: 'pop 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
