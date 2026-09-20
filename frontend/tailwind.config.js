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
        butterBg: '#fefce8',       // Light butter yellow page background
        butterCard: '#fef9c3',     // Soft pastel butter yellow card container
        butterCardWarm: '#fef08a', // Slightly deeper butter yellow accent
        butterAccent: '#fde047',   // Vibrant butter yellow button background
        butterHighlight: '#facc15',// Deep yellow highlight
        butterMuted: '#fffdf0',    // Creamy white background container
        darkText: '#0f172a',       // Rich high-contrast text
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000000',
        'brutal-sm': '3px 3px 0px 0px #000000',
        'brutal-lg': '6px 6px 0px 0px #000000',
      }
    },
  },
  plugins: [],
}
