import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js lives in a lazily loaded chunk of its own
  build: { chunkSizeWarningLimit: 700 },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
