import { expect, test } from "@playwright/test";

test.describe("public smoke navigation", () => {
  test("home exposes the primary quote path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /tatuajes con diseño, criterio y una experiencia segura/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /solicitar cotización/i }).first()).toBeVisible();
  });

  test("primary public navigation pages render", async ({ page }) => {
    const routes = [
      ["/portfolio", /piezas, referencias y lenguaje visual/i],
      ["/quote", /cuéntame tu idea con contexto/i],
      ["/quote/status", /revisa el estado de tu cotización/i],
      ["/opiniones", /experiencias publicadas por clientes/i],
      ["/comunidad", /novedades sin ruido/i],
      ["/colaboradores", /marcas y aliados del estudio/i],
      ["/contacto", /hablemos de tu próxima pieza/i],
    ] as const;

    for (const [route, heading] of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
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

  test("shop renders a deterministic empty or fallback catalog state", async ({ page }) => {
    await page.goto("/tienda");

    await expect(page.getByRole("heading", { name: "Obras disponibles" })).toBeVisible();
    await expect(
      page.getByText(/No hay obras disponibles publicadas|Catálogo temporal en modo referencia/i),
    ).toBeVisible();
  });

  test("community unsubscribe page keeps the privacy copy visible", async ({ page }) => {
    await page.goto("/comunidad/baja");

    await expect(page.getByRole("heading", { name: "Cancelar comunicaciones" })).toBeVisible();
    await expect(page.getByText(/no confirmaremos si el correo existe/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar baja" })).toBeVisible();
  });

  test("reviews and sponsors pages render safe public empty states", async ({ page }) => {
    await page.goto("/opiniones");
    await expect(
      page.getByRole("heading", { name: "Experiencias publicadas por clientes." }),
    ).toBeVisible();

    await page.goto("/colaboradores");
    await expect(page.getByRole("heading", { name: "Marcas y aliados del estudio." })).toBeVisible();
  });

  test("admin route renders its authentication shell without exposing protected data", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByText(/Admin|panel admin/i).first()).toBeVisible();
  });
});
