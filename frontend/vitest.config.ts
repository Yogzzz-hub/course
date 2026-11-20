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
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
