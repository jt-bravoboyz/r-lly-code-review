import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/settlementLinks.ts",
        "src/lib/sanitize.ts",
        "src/lib/rideStatus.ts",
        "src/lib/formatDistance.ts",
        "src/lib/nativeLinks.ts",
        "src/lib/shareUrls.ts",
        "src/hooks/useSettlementReturn.ts",
      ],
      exclude: ["**/*.test.*", "**/*.spec.*"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
