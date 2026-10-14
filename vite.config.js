import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Les appels /api du site sont redirigés vers le serveur Express.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
