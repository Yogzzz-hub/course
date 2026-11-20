import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBF9F5", // Warm Ivory
        surface: "#FFFFFF",    // Pure White
        parchment: "#F5F0E8",  // Soft Parchment secondary background
        ivory: {
          DEFAULT: "#FBF9F5",
          dark: "#F5F0E8",
          light: "#FFFDFB",
        },
        burgundy: {
          DEFAULT: "#6D1A2B", // Heritage Burgundy
          hover: "#4E0F1E",   // Deep Burgundy
          dark: "#4E0F1E",
          light: "#8C2A3E",
          50: "#FDF5F6",
          100: "#FBE8EB",
          200: "#F7D1D7",
          500: "#6D1A2B",
          700: "#4E0F1E",
          900: "#2A0F16",
        },
        primary: {
          DEFAULT: "#6D1A2B",
          hover: "#4E0F1E",
          light: "#8C2A3E",
          dark: "#4E0F1E",
          50: "#FDF5F6",
          100: "#FBE8EB",
          200: "#F7D1D7",
          500: "#6D1A2B",
          700: "#4E0F1E",
          900: "#2A0F16",
        },
        gold: {
          DEFAULT: "#C9A24B", // Champagne Gold
          hover: "#B38C37",
          dark: "#997324",
          light: "#DEC278",
          tint: "#F6EBCF",
          50: "#FAF6EC",
          100: "#F6EBCF",
          500: "#C9A24B",
          700: "#9A7829",
        },
        teal: {
          DEFAULT: "#315F70", // Muted Petrol Teal
          hover: "#254B59",
          dark: "#1B3640",
          light: "#4B7C91",
          tint: "#EAF2F5",
          50: "#F2F7F9",
          100: "#EAF2F5",
          500: "#315F70",
          700: "#254B59",
        },
        ink: {
          DEFAULT: "#251923", // Deep Ink primary text
          charcoal: "#6B6268", // Muted Charcoal secondary text
          muted: "#6B6268",
          light: "#9A9197",
          border: "#E9E0D8",  // Warm Grey
        },
        warm: {
          border: "#E9E0D8",
          grey: "#E9E0D8",
          light: "#F5F0E8",
        },
        forest: {
          DEFAULT: "#19674B", // Forest Green success
          dark: "#134D38",
          light: "#E7F3EE",
          border: "#A7D6C3",
        },
        restrainedRed: {
          DEFAULT: "#B42318", // Restrained Red error
          dark: "#911B12",
          light: "#FEECEB",
          border: "#FDA29B",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(37, 25, 35, 0.04)",
        card: "0 2px 8px -2px rgba(109, 26, 43, 0.05), 0 1px 3px -1px rgba(37, 25, 35, 0.04)",
        elevated: "0 10px 24px -4px rgba(109, 26, 43, 0.08), 0 4px 8px -2px rgba(37, 25, 35, 0.03)",
        dropdown: "0 12px 32px -4px rgba(37, 25, 35, 0.12), 0 4px 8px -2px rgba(37, 25, 35, 0.04)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUpFade: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up": "slideUpFade 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pop-in": "popIn 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
