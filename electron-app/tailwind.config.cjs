/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Kaisei Tokumin"', "serif"],
        emp: ['"Newsreader"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        grey: {
          50: "#f7f6f6",
          100: "#e6e2e1",
          200: "#cdc5c2",
          300: "#aca19c",
          400: "#8a7d77",
          500: "#70615c",
          600: "#584e49",
          700: "#48423d",
          800: "#3c3633",
          900: "#342f2d",
          950: "#1c1917",
        },
      },
    },
  },
  plugins: [],
};
