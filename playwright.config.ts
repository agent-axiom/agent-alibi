import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure"
  }
});
