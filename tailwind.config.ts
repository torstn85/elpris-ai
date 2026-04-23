import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A2540",
        accent: "#00E5FF",
        cta: "#22C55E",
        danger: "#EF4444",
        surface: "#0F3460",
        muted: "#1E4976",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        tight: ["Inter Tight", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
