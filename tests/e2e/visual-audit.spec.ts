import { expect, test } from "@playwright/test";

const routes = [
  ["home", "/"],
  ["quote", "/quote"],
  ["tracking", "/quote/status"],
  ["contact", "/contacto"],
  ["reviews", "/opiniones"],
  ["community", "/comunidad"],
  ["collaborators", "/colaboradores"],
  ["services", "/servicios"],
  ["privacy", "/privacidad"],
  ["booking-terms", "/terminos-reserva"],
  ["admin", "/admin"],
] as const;

async function assertNoLayoutOverflow(page: import("@playwright/test").Page) {
  const layout = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const headings = Array.from(document.querySelectorAll("h1, h2, h3")).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        text: element.textContent?.trim().slice(0, 80) ?? "",
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    });

    return { viewportWidth, documentWidth, headings };
  });

  expect(layout.documentWidth, "La página no debe generar scroll horizontal").toBeLessThanOrEqual(
    layout.viewportWidth + 2,
  );

  for (const heading of layout.headings) {
    expect(heading.width, `Título sin ancho: ${heading.text}`).toBeGreaterThan(0);
    expect(heading.height, `Título sin alto: ${heading.text}`).toBeGreaterThan(0);
    expect(heading.left, `Título sale por la izquierda: ${heading.text}`).toBeGreaterThanOrEqual(-2);
    expect(heading.right, `Título sale por la derecha: ${heading.text}`).toBeLessThanOrEqual(
      layout.viewportWidth + 2,
    );
  }
}

for (const [name, route] of routes) {
  test(`visual audit ${name} desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await assertNoLayoutOverflow(page);
    await page.screenshot({
      path: test.info().outputPath(`${name}-desktop.png`),
      fullPage: true,
    });
  });

  test(`visual audit ${name} mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await assertNoLayoutOverflow(page);
    await page.screenshot({
      path: test.info().outputPath(`${name}-mobile.png`),
      fullPage: true,
    });
  });
}
