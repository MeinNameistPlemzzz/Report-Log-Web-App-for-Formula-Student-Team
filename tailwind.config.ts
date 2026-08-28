import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["IBM Plex Sans Thai", "IBM Plex Sans", "system-ui", "sans-serif"],
        body:    ["IBM Plex Sans Thai", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono:    ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // theme-neutral fallbacks — real colours come from CSS vars
        base:     "var(--bg-base)",
        surface:  "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        overlay:  "var(--bg-overlay)",
        accent:   "var(--accent)",
        brand:    "var(--brand)",
      },
      // crisp logbook corners — remap the whole radius scale tighter
      borderRadius: {
        none: "0",
        sm:   "3px",
        DEFAULT: "4px",
        md:   "4px",
        lg:   "5px",
        xl:   "6px",
        "2xl": "8px",
        "3xl": "10px",
        full: "9999px",
      },
      animation: {
        "fade-up": "fadeUp 0.28s ease both",
        "fade-in": "fadeIn 0.2s ease both",
        "shimmer": "shimmer 1.4s infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
