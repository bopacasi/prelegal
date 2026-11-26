import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/…" import alias as tsconfig.json.
    alias: [{ find: /^@\//, replacement: `${import.meta.dirname}/` }],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "proxy.test.ts"],
  },
});
