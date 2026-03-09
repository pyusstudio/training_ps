/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#020617",
        card: "#020617",
        accentGreen: "#22c55e",
        accentRed: "#ef4444",
        muted: "#1e293b",
        reflex: {
          black: '#000000',
          silver: '#d4d4d4',
          green: '#22c55e',
          red: '#ef4444'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 1.4s infinite ease-in-out both'
      },
      keyframes: {
        typing: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
};

