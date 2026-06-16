import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertLocalAdminSeedEnvironment } from "./local-admin-seed-guard.mjs";

const validLocalEnv = {
  NODE_ENV: "development",
  FIREBASE_PROJECT_ID: "demo-webtatuajes",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
};

describe("local admin seed guard", () => {
  it("allows the explicit local emulator configuration", () => {
    expect(() => assertLocalAdminSeedEnvironment(validLocalEnv)).not.toThrow();
  });

  it("rejects production, real credentials, non-demo projects, and non-local hosts", () => {
    expect(() =>
      assertLocalAdminSeedEnvironment({ ...validLocalEnv, NODE_ENV: "production" }),
    ).toThrow("NODE_ENV=production");
    expect(() =>
      assertLocalAdminSeedEnvironment({
        ...validLocalEnv,
        FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"real"}',
      }),
    ).toThrow("FIREBASE_SERVICE_ACCOUNT_JSON");
    expect(() =>
      assertLocalAdminSeedEnvironment({ ...validLocalEnv, FIREBASE_PROJECT_ID: "real-project" }),
    ).toThrow("demo-webtatuajes");
    expect(() =>
      assertLocalAdminSeedEnvironment({
        ...validLocalEnv,
        FIREBASE_AUTH_EMULATOR_HOST: "auth.example.com",
      }),
    ).toThrow("local Auth emulator");
  });

  it("loads .env.local before running the local seed script", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts["admin:seed-local"]).toContain("--env-file=.env.local");
  });
});
