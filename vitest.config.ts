import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "firebase/**/*.test.ts", "tests/e2e/**/*.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
