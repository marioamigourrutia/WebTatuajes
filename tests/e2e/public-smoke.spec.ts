import { expect, test } from "@playwright/test";

test.describe("public smoke navigation", () => {
  test("home exposes the primary quote path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /tatuajes con diseño, criterio y una experiencia segura/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Solicitar cotización" }).first()).toBeVisible();
  });

  test("quote page renders without requiring Firebase secrets", async ({ page }) => {
    await page.goto("/quote");

    await expect(
      page.getByRole("heading", { name: "Cuéntanos tu idea con contexto." }),
    ).toBeVisible();
    await expect(page.getByText(/abriremos WhatsApp/i)).toBeVisible();
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
    await expect(page.getByText(/Todavía no hay opiniones publicadas/i)).toBeVisible();

    await page.goto("/colaboradores");

    await expect(
      page.getByRole("heading", { name: "Marcas y aliados del estudio." }),
    ).toBeVisible();
    await expect(page.getByText(/Aún no hay colaboradores publicados/i)).toBeVisible();
  });

  test("admin page starts from the unauthenticated state without Firebase public envs", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page.getByText(/Admin|panel admin/i).first()).toBeVisible();
    await expect(
      page.getByText(/Login preparado\. Configura `NEXT_PUBLIC_FIREBASE_\*`/i),
    ).toBeVisible();
    await expect(page.getByText("Autenticado: no")).toBeVisible();
  });
});
