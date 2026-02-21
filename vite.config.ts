import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/client"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3333",
      "/raw": "http://localhost:3333",
      "/ws": {
        target: "ws://localhost:3333",
        ws: true,
      },
    },
  },
})
