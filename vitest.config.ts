import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Opt-in via `npm run test:coverage` (needs @vitest/coverage-v8).
    // Plain `npm test` stays fast and dependency-light.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      // Tests and pure type declarations carry no logic worth measuring.
      exclude: ["src/**/*.test.ts", "src/types.ts"],
    },
  },
});
