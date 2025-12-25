import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // DocuMind 暖铜色系
        bronze: {
          50: "#F5F1EC",
          100: "#E6DFD4",
          200: "#C4B8A3",
          300: "#9C8B72",
          400: "#7D6A51",
          500: "#6B5A42",
          600: "#5A4A36",
          700: "#473929",
          800: "#352A1E",
          900: "#21180F",
        },
        cream: {
          50: "#FDFBF7",
          100: "#F8F2E5",
          200: "#F3EBD9",
          300: "#EDE3CC",
          400: "#E7DBBF",
        },
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
