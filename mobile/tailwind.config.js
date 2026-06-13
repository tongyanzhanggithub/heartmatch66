/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 半日相知品牌色：陶土橙（日出）
        primary: {
          50:'#fdf6f0', 100:'#fbeadf', 200:'#f6d0bc', 300:'#efb094',
          400:'#e8956f', 500:'#e07b54', 600:'#c9633d', 700:'#a84e2f',
          800:'#873e26', 900:'#6e3420'
        },
        cream: '#fbf3ea',
        sunray: '#e9a23b',
      },
    },
  },
  plugins: [],
}

