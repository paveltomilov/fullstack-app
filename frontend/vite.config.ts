import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    minify: "esbuild", // или "terser", если нужно
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
