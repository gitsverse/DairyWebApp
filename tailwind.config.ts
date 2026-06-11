import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      colors: {
        page: "#f8fafc", // slate-50
        foreground: "#0f172a", // slate-900
        card: "#ffffff",
        cream: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
        },
        primary: {
          DEFAULT: "#059669", // Emerald 600
          foreground: "#ffffff",
          muted: "#047857", // Emerald 700
        },
        secondary: {
          DEFAULT: "#f1f5f9", // Slate 100
          foreground: "#334155", // Slate 700
        },
        accent: {
          DEFAULT: "#2563eb", // Blue 600
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444", // Red 500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f1f5f9", // Slate 100
          foreground: "#64748b", // Slate 500
        },
        border: "#e2e8f0", // Slate 200
        input: "#ffffff",
      },
      borderRadius: {
        lg: `0.5rem`,
        md: `calc(0.5rem - 2px)`,
        sm: `calc(0.5rem - 4px)`,
      },
      boxShadow: {
        lift: "0 8px 30px -12px hsl(152 40% 20% / 0.2)",
        card: "0 2px 12px hsl(152 25% 50% / 0.08)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
