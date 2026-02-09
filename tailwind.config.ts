import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        carbon: {
          50: "#F0EDE6",
          100: "#D8D3C9",
          200: "#B0A999",
          300: "#88806F",
          400: "#5C5548",
          500: "#3A3530",
          600: "#282420",
          700: "#1C1915",
          800: "#13110E",
          900: "#0B0A08",
          950: "#060504",
        },
        copper: {
          DEFAULT: "#D4915C",
          50: "#FDF4EC",
          100: "#F9E4CF",
          200: "#F0C8A0",
          300: "#E5A872",
          400: "#D4915C",
          500: "#B87A4A",
          600: "#96623B",
          700: "#744B2D",
          800: "#533520",
          900: "#311F13",
        },
        sage: {
          DEFAULT: "#7B9E6B",
          50: "#F0F4ED",
          100: "#D8E4D0",
          200: "#B5C9A8",
          300: "#92AE80",
          400: "#7B9E6B",
          500: "#648256",
          600: "#4E6643",
          700: "#3A4C32",
          800: "#263322",
          900: "#131912",
        },
        rust: {
          DEFAULT: "#C75C5C",
          50: "#FBF0F0",
          100: "#F5D6D6",
          200: "#E8ACAC",
          300: "#D98282",
          400: "#C75C5C",
          500: "#A84A4A",
          600: "#873B3B",
          700: "#662D2D",
          800: "#451F1F",
          900: "#231010",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)",
        elevated:
          "0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        "glow-copper": "0 0 20px rgba(212,145,92,0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
