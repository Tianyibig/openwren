import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri expects a fixed port and ignores its own Rust sources when watching.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Five seconds — Vitest's default — is the time the whole file gets, and on a busy
    // machine a jsdom file can spend longer than that just starting: the run then reports
    // one worker error and silently fewer tests, which looks like a failure in the code.
    // The tests themselves take milliseconds; waiting longer costs nothing when they pass.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
