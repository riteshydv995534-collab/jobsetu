/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070F1E',
          900: '#0B192C',
          800: '#152C48',
          700: '#1E3E62',
          600: '#2A527F',
          500: '#3D6B9C',
          100: '#E7EEF6',
          50: '#F3F7FA'
        },
        govTeal: {
          900: '#064E48',
          700: '#0B7A70',
          600: '#028090',
          500: '#00A896',
          400: '#14B8A6',
          100: '#E0F5F2',
          50: '#F0FAF8'
        }
      }
    },
  },
  plugins: [],
}
