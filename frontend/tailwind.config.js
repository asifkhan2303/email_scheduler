/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00A844", dark: "#008A38", soft: "#E4F4EA" },
        surface: "#F4F5F4",
        line: "#EEEFEE",
        ink: { DEFAULT: "#1B1B1B", muted: "#8A8F8B" },
        chip: { bg: "#FFE7D3", text: "#C2500A", border: "#F9C9A4" }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        pixel: ["Silkscreen", "ui-monospace", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
