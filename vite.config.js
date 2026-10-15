import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Les appels /api du site sont redirigés vers le serveur Express.
    // changeOrigin: false garde l'en-tête Host d'origine, attendu par la protection CSRF de l'API.
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: false },
    },
  },
});
