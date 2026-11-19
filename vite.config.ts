import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: {
    port: 5471,
    strictPort: true,
    proxy: { "/socket.io": { target: "http://localhost:3471", ws: true } },
  },
  worker: { format: "es" },
  test: { root: ".", include: ["tests/**/*.test.ts"] },
} as any);
