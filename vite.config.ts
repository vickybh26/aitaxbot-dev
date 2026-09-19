import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — loaded on every page
          "vendor-react": ["react", "react-dom"],
          // Routing
          "vendor-router": ["wouter"],
          // UI / query
          "vendor-ui": ["@tanstack/react-query", "react-helmet-async"],
          // recharts and jspdf are deliberately NOT listed here. Naming a
          // manual chunk puts it in the entry's chunk graph, which makes Vite
          // emit <link rel="modulepreload"> for it in index.html — so the
          // browser downloaded both on every page even after their only static
          // imports were removed. Measured 2026-09-19: vendor-charts 104 KB and
          // vendor-pdf 133 KB were still arriving on /calculators/income-tax
          // with nothing importing them. Left unlisted, Rollup splits them off
          // the lazy import sites (RegimeChart, and the Download handler in
          // Dashboard) and they load on demand.
          // Firebase (large — only used on auth/admin pages)
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/analytics", "firebase/ai", "firebase/app-check"],
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
