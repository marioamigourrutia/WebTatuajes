import { test } from "@playwright/test";

const routes = [
  ["home", "/"],
  ["quote", "/quote"],
  ["tracking", "/quote/status"],
  ["contact", "/contacto"],
  ["community", "/comunidad"],
  ["admin", "/admin"],
] as const;

for (const [name, route] of routes) {
  test(`visual audit ${name} desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(route);
    await page.screenshot({
      path: test.info().outputPath(`${name}-desktop.png`),
      fullPage: true,
    });
  });

  test(`visual audit ${name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.screenshot({
      path: test.info().outputPath(`${name}-mobile.png`),
      fullPage: true,
    });
  });
}
