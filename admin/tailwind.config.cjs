/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        reflex: {
          black: "#000000",
          silver: "#d4d4d4",
          green: "#22c55e",
          red: "#ef4444"
        },
        background: "#020617",
        card: "#020617",
        accentGreen: "#22c55e",
        accentRed: "#ef4444",
        muted: "#1e293b"
      }
    }
  },
  plugins: []
};

