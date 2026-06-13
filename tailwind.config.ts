import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        // Escala teal de marca (acento). Tonos calibrados para salud: serenos.
        brand: {
          50: "#f2fbf9",
          100: "#d3f4ee",
          200: "#a8e8df",
          300: "#72d4c8",
          400: "#3fb8ab",
          500: "#1f9c90",
          600: "#14796f",
          700: "#136257",
          800: "#134e47",
          900: "#11403b",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Jerarquía de elevación: sombras suaves, multicapa y con tinte cálido.
      boxShadow: {
        e1: "0 1px 2px 0 hsl(30 25% 12% / 0.04), 0 1px 3px -1px hsl(30 25% 12% / 0.05)",
        e2: "0 2px 5px -1px hsl(30 25% 12% / 0.07), 0 8px 20px -6px hsl(30 25% 12% / 0.10)",
        e3: "0 10px 28px -8px hsl(30 25% 12% / 0.16), 0 3px 8px -3px hsl(30 25% 12% / 0.08)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slot-pop": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "draw-line": {
          from: { strokeDashoffset: "var(--pulse-length, 48)" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slot-pop": "slot-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        "draw-line": "draw-line 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
