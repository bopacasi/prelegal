import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/…" import alias as tsconfig.json.
    alias: [{ find: /^@\//, replacement: `${import.meta.dirname}/` }],
  },
  // tsconfig.json keeps JSX as-is for Next.js ("preserve"); tests need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx", "proxy.test.ts"],
  },
});
