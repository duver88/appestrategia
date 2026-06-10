import type { Config } from "tailwindcss";

// Tokens del sistema de diseño LIONSCORE (ver SISTEMA DE DISEÑO / skill
// lionscore-design). Una sola familia tipográfica; jerarquía por peso.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#021130",
          800: "#0A1F4A",
          700: "#142E5E",
          500: "#3D5380",
          300: "#8FA3C4",
        },
        ink: { 600: "#46557A", 400: "#8B97B5" },
        line: { 200: "#E4E9F4" },
        surface: { 50: "#F6F8FC" },
        cyan: { 400: "#12FDEE", soft: "rgba(18,253,238,0.12)" },
        teal: { 700: "#0B8F86" },
        warn: { 500: "#F5A524" },
        danger: { 500: "#E5484D" },
        green: { 500: "#2EC27E" },
        purple: { 500: "#8A63D2" },
        cream: "#FAF7F2", // solo plantilla PDF
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito Sans", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 28px rgba(2,17,48,0.08)",
        pop: "0 16px 48px rgba(2,17,48,0.16)",
        glow: "0 0 0 4px rgba(18,253,238,0.25)",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.2, 0, 0, 1)",
      },
      keyframes: {
        "pulse-cyan": {
          "0%": { boxShadow: "0 0 0 0 rgba(18,253,238,0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(18,253,238,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(18,253,238,0)" },
        },
        "enter-fade": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-cyan": "pulse-cyan 2s infinite",
        "enter-fade": "enter-fade 220ms cubic-bezier(0.2,0,0,1)",
      },
    },
  },
  plugins: [],
};

export default config;
