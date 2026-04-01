import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",        // 🔥 NUEVO (CLAVE)
    "./pages/**/*.{js,ts,jsx,tsx}",      // opcional pero recomendado
    "./components/**/*.{js,ts,jsx,tsx}", // si tienes en root
    "./src/**/*.{js,ts,jsx,tsx}",        // mantiene compatibilidad
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;