/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#090d16',
        darkCard: '#121824',
        darkBorder: '#1e293b',
        accentGreen: '#00ff66',
        accentIndigo: '#6366f1',
      },
    },
  },
  plugins: [],
}
