import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    css: false,
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "**/browser/**", "**/learning-browser/**", "**/learning-integration.test.ts"],
  },
  resolve: {
    alias: {
      "@/frontend": path.resolve(__dirname, "./frontend"),
      "@/backend": path.resolve(__dirname, "./backend"),
      "@/db": path.resolve(__dirname, "./db"),
      "@/lib": path.resolve(__dirname, "./backend/services"),
      "@/components": path.resolve(__dirname, "./frontend/components"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
