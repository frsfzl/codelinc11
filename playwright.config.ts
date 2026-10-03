import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3001",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    channel: "chrome",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Browser dictation tests intercept /api/transcribe; no provider credentials needed.
    env: {
      APP_ORIGIN: "http://127.0.0.1:3001",
      ELEVENLABS_API_KEY: "",
      ELEVENLABS_AGENT_ID: "",
      ELEVENLABS_USE_CLI: "true",
      ELEVENLABS_CLI_PATH: "mocked-in-browser-tests",
    },
  },
});
