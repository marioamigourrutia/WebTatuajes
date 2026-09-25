import { expect, test } from "@playwright/test";

const publicRoutes = [
  ["/", /tatuajes con diseño, criterio y una experiencia segura/i],
  ["/quote", /cuéntame tu idea con contexto/i],
  ["/quote/status", /revisa el estado de tu cotización/i],
  ["/opiniones", /experiencias publicadas por clientes/i],
  ["/comunidad", /novedades sin ruido/i],
  ["/colaboradores", /marcas y aliados del estudio/i],
  ["/contacto", /hablemos de tu próxima pieza/i],
  ["/servicios", /información clara antes de cotizar/i],
  ["/tienda", /obras disponibles/i],
] as const;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewport + 2);
}

test.describe("public smoke navigation", () => {
  test("home exposes the primary quote path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /tatuajes con diseño, criterio y una experiencia segura/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /solicitar cotización/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /instagram/i }).first()).toBeVisible();
  });

  test("primary public navigation pages render", async ({ page }) => {
    for (const [route, heading] of publicRoutes.slice(1)) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    }
  });

  test("public routes do not create horizontal overflow on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const [route] of publicRoutes) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("public routes do not create horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const [route] of publicRoutes) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("quote page keeps the operational form and calendar container", async ({ page }) => {
    await page.goto("/quote");

    await expect(page.getByLabel(/nombre/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByText(/calendario interactivo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar|registrar|cotización/i }).last()).toBeVisible();
  });

  test("quote tracking renders independently from a successful backend lookup", async ({ page }) => {
    await page.goto("/quote/status");

    await expect(page.getByLabel(/código de cotización/i)).toBeVisible();
    await expect(page.getByLabel(/email usado al cotizar/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /consultar/i })).toBeVisible();
  });

  test("historical portfolio route delegates visual work to Instagram", async ({ page }) => {
    const response = await page.goto("/portfolio");
    expect(response).not.toBeNull();
    await expect(page).toHaveURL(/instagram\.com|\/$/);
  });

  test("shop renders a deterministic empty or fallback catalog state", async ({ page }) => {
    await page.goto("/tienda");

    await expect(page.getByRole("heading", { name: /obras disponibles/i })).toBeVisible();
    await expect(
      page.getByText(/No hay obras disponibles publicadas|Catálogo temporal \/ referencia/i),
    ).toBeVisible();
  });

  test("community unsubscribe page keeps the privacy copy visible", async ({ page }) => {
    await page.goto("/comunidad/baja");

    await expect(page.getByRole("heading", { name: /cancelar comunicaciones/i })).toBeVisible();
    await expect(page.getByText(/no confirmaremos si el correo existe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar baja" })).toBeVisible();
  });

  test("reviews and sponsors pages render safe public shells", async ({ page }) => {
    await page.goto("/opiniones");
    await expect(
      page.getByRole("heading", { name: /experiencias publicadas por clientes/i }),
    ).toBeVisible();

    await page.goto("/colaboradores");
    await expect(page.getByRole("heading", { name: /marcas y aliados del estudio/i })).toBeVisible();
  });

  test("admin route renders its authentication shell without exposing protected data", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: /control del estudio/i })).toBeVisible();
    await expect(page.getByText(/panel|gestión operativa/i).first()).toBeVisible();
  });
});
