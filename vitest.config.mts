import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    hookTimeout: 120000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "server-only": new URL(
        "./tests/server-only.ts",
        import.meta.url,
      ).pathname.replace(/^\/(\w:)/, "$1"),
    },
  },
});
