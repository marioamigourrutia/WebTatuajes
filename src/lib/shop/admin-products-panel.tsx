"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { formatClpPrice, productStatusLabels, productStatuses } from "./catalog";
import type { AdminProduct } from "./product";

function productToPayload(formData: FormData) {
  return {
    ...Object.fromEntries(formData.entries()),
    active: formData.get("active") === "on",
  };
}

export function AdminProductsPanel({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar obras.");
    return user.getIdToken();
  }

  async function loadProducts() {
    if (!enabled || !user) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as { products?: AdminProduct[]; error?: string };

      if (!response.ok) {
        setError(body.error ?? "No se pudo listar obras.");
        setProducts([]);
        return;
      }

      setProducts(body.products ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo listar obras.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const form = event.currentTarget;
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(productToPayload(new FormData(form))),
      });
      const body = (await response.json()) as { id?: string; errors?: Record<string, string> };

      if (!response.ok || !body.id) {
        setError(Object.values(body.errors ?? {})[0] ?? "No se pudo crear la obra.");
        return;
      }

      form.reset();
      setNotice("Obra creada desde ruta server-side con rol admin validado.");
      await loadProducts();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear la obra.");
    } finally {
      setSaving(false);
    }
  }

  async function submitProductForm(event: FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    setUpdatingProductId(productId);
    setError(null);
    setNotice(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...productToPayload(new FormData(event.currentTarget)) }),
      });
      const body = (await response.json()) as { id?: string; errors?: Record<string, string> };

      if (!response.ok || !body.id) {
        setError(Object.values(body.errors ?? {})[0] ?? "No se pudo actualizar la obra.");
        return;
      }

      setNotice("Obra actualizada.");
      await loadProducts();
    } catch {
      setError("No se pudo conectar con la ruta server-side de obras.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function hideProduct(productId: string) {
    setUpdatingProductId(productId);
    setError(null);
    setNotice(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const body = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !body.id) {
        setError(body.error ?? "No se pudo ocultar la obra.");
        return;
      }

      setNotice("Obra oculta. No se eliminó porque puede estar asociada a solicitudes históricas.");
      await loadProducts();
    } catch {
      setError("No se pudo conectar con la ruta server-side de obras.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div>
        <h3 className="text-xl font-bold text-stone-50">Tienda y obras disponibles</h3>
        <p className="mt-1 text-sm text-stone-400">
          Crea y actualiza obras de la tienda. Ocultar no elimina registros históricos de compras.
        </p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <form
        className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
        onSubmit={createProduct}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Código
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              maxLength={40}
              name="code"
              placeholder="OBR-001"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Título
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              maxLength={120}
              name="title"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Precio CLP
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              min={0}
              name="priceClp"
              required
              type="number"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Estado
            <select
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              defaultValue="available"
              name="status"
            >
              {productStatuses.map((status) => (
                <option key={status} value={status}>
                  {productStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            URL de imagen opcional
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              inputMode="url"
              name="imageUrl"
              placeholder="https://..."
              type="url"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Orden
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              defaultValue={0}
              max={9999}
              min={0}
              name="sortOrder"
              type="number"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Descripción pública
          <textarea
            className="min-h-20 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            maxLength={500}
            name="description"
            required
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-200">
          <input className="h-4 w-4" defaultChecked name="active" type="checkbox" />
          Mostrar en tienda
        </label>
        <button
          className="w-fit rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Creando…" : "Crear obra"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-bold text-stone-100">Obras registradas</h4>
          <button
            className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200"
            disabled={loading}
            onClick={loadProducts}
            type="button"
          >
            {loading ? "Cargando…" : "Refrescar"}
          </button>
        </div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">
            Todavía no hay obras en Firestore.
          </p>
        ) : (
          products.map((product) => (
            <form
              className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
              key={product.id}
              onSubmit={(event) => submitProductForm(event, product.id)}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-100">{product.title}</p>
                  <p className="font-mono text-xs text-amber-200">
                    {product.code} · {formatClpPrice(product.priceClp)}
                  </p>
                </div>
                <p className="text-sm text-stone-400">{product.active ? "Visible" : "Oculta"}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.code}
                  maxLength={40}
                  name="code"
                  required
                />
                <input
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.title}
                  maxLength={120}
                  name="title"
                  required
                />
                <input
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.priceClp}
                  min={0}
                  name="priceClp"
                  required
                  type="number"
                />
                <select
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.status}
                  name="status"
                >
                  {productStatuses.map((status) => (
                    <option key={status} value={status}>
                      {productStatusLabels[status]}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.imageUrl ?? ""}
                  inputMode="url"
                  name="imageUrl"
                  placeholder="https://..."
                  type="url"
                />
                <input
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                  defaultValue={product.sortOrder}
                  max={9999}
                  min={0}
                  name="sortOrder"
                  type="number"
                />
              </div>
              <textarea
                className="min-h-20 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
                defaultValue={product.description}
                maxLength={500}
                name="description"
                required
              />
              <label className="flex items-center gap-2 text-sm text-stone-200">
                <input
                  className="h-4 w-4"
                  defaultChecked={product.active}
                  name="active"
                  type="checkbox"
                />
                Mostrar en tienda
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-60"
                  disabled={updatingProductId === product.id}
                  type="submit"
                >
                  Guardar
                </button>
                <button
                  className="rounded-full border border-red-300/50 px-4 py-2 text-sm font-semibold text-red-100 disabled:opacity-60"
                  disabled={updatingProductId === product.id}
                  onClick={() => hideProduct(product.id)}
                  type="button"
                >
                  Ocultar
                </button>
              </div>
            </form>
          ))
        )}
      </div>
    </section>
  );
}
