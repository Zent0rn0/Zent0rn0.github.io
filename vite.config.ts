import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // the page is prerendered at build time, so text and contacts arrive as HTML before any script runs
  plugins: [preact({ prerender: { enabled: true, renderTarget: "#root", previewMiddlewareEnabled: true } })],
  // three.js lives in a lazily loaded chunk of its own
  build: { chunkSizeWarningLimit: 700 },
});
