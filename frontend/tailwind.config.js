/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F7FB",
        ink: "#1B2A41",
        gold: "#F5B700",
        brainbuster: "#FF6459",
        quickfire: "#06A77D",
        askexplore: "#5B5BD6",
      },
      fontFamily: {
        display: ["Baloo 2", "cursive"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
