import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const defaultBaseURL = `http://127.0.0.1:${port}`;

function resolveLocalBaseURL() {
  const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;

  if (!configuredBaseURL) {
    return defaultBaseURL;
  }

  const parsedBaseURL = new URL(configuredBaseURL);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (parsedBaseURL.protocol !== "http:" || !localHosts.has(parsedBaseURL.hostname)) {
    throw new Error("PLAYWRIGHT_BASE_URL must target local HTTP only for E2E tests.");
  }

  return parsedBaseURL.toString().replace(/\/$/, "");
}

function sanitizedWebServerEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => value !== undefined && !key.includes("FIREBASE"),
    ),
  );
}

const firebaseEnvOverrides = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED: "",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: "",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  FIREBASE_ADMIN_CONFIRM_ASSIGNMENT: "",
  FIREBASE_AUTH_EMULATOR_HOST: "",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
  FIREBASE_STORAGE_BUCKET: "",
  FIREBASE_STORAGE_EMULATOR_HOST: "",
  FIRESTORE_EMULATOR_HOST: "",
  GCLOUD_PROJECT: "",
  GOOGLE_APPLICATION_CREDENTIALS: "",
  GOOGLE_CLOUD_PROJECT: "",
  STORAGE_EMULATOR_HOST: "",
};

const baseURL = resolveLocalBaseURL();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...sanitizedWebServerEnv(),
      ...firebaseEnvOverrides,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
