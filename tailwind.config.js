/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1a2b6d", // dark blue, like Polymarket
          light: "#3b4a8f",
          accent: "#00c2ff",  // cyan highlight
        },
      },
    },
  },
  plugins: [],
};
