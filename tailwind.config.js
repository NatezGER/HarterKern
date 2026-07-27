/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#080909",
        foreground: "#f7f6f2",
        card: "#111312",
        muted: "#9a9b97",
        gold: {
          300: "#f6d98a",
          400: "#e7ba4b",
          500: "#c99322",
          600: "#9f6e0f"
        },
        beer: "#ffb31f"
      },
      fontFamily: {
        display: ["Barlow Condensed", "sans-serif"],
        sans: ["Inter", "sans-serif"]
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)"
      },
      boxShadow: {
        gold: "0 0 48px rgba(231,186,75,.16)",
        "gold-sm": "0 0 24px rgba(231,186,75,.12)"
      }
    }
  },
  plugins: []
};
