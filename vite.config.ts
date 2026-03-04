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
          // Charts & heavy visualisation libs
          "vendor-charts": ["recharts"],
          // Firebase (large — only used on auth/admin pages)
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/analytics", "firebase/ai", "firebase/app-check"],
          // PDF generation (large — only used in calculator pages)
          "vendor-pdf": ["jspdf"],
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
