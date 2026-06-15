import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "firebase/**/*.test.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
