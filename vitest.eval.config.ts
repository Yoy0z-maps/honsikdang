import { defineConfig } from "vitest/config";

// Live model evaluations (npm run eval:parse). Not part of `npm test`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["scripts/**/*.eval.ts"],
  },
});
