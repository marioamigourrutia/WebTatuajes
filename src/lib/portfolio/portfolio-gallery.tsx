"use client";

import { useMemo, useState } from "react";
import {
  filterPortfolioItems,
  getPortfolioStyles,
  getPortfolioTags,
  type PublicPortfolioItem,
} from "./portfolio";

type PortfolioGalleryProps = {
  items: PublicPortfolioItem[];
};

export function PortfolioGallery({ items }: PortfolioGalleryProps) {
  const [styleFilter, setStyleFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const styles = useMemo(() => getPortfolioStyles(items), [items]);
  const tags = useMemo(() => getPortfolioTags(items), [items]);
  const filteredItems = useMemo(
    () => filterPortfolioItems({ style: styleFilter, tag: tagFilter }, items),
    [items, styleFilter, tagFilter],
  );

  return (
    <section className="space-y-8 py-10" aria-label="Portafolio de trabajos">
      <div className="grid gap-4 rounded-3xl border border-amber-100/10 bg-stone-950/70 p-5 shadow-xl shadow-black/20 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-stone-200">
          Estilo
          <select
            className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-300"
            value={styleFilter}
            onChange={(event) => setStyleFilter(event.target.value)}
          >
            <option value="">Todos los estilos</option>
            {styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-stone-200">
          Etiqueta
          <select
            className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-300"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
          >
            <option value="">Todas las etiquetas</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <article
            className="group overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/75 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/40"
            key={item.id}
          >
            <div
              className="relative flex h-56 items-end overflow-hidden p-5"
              style={item.imageUrl ? undefined : { background: item.gradient }}
            >
              {item.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    src={item.imageUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/10 to-stone-950/85" />
                </>
              ) : null}
              <div className="relative z-10 rounded-2xl bg-stone-950/80 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {item.style}
                </p>
                <h2 className="mt-1 text-2xl font-black text-stone-50">{item.title}</h2>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">
                Zona: {item.bodyArea}
              </p>
              <p className="leading-7 text-stone-300">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    className="rounded-full border border-stone-700 px-3 py-1 text-xs font-semibold text-stone-200"
                    key={tag}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <a
                className="inline-flex rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-950 shadow-md shadow-amber-950/25 transition hover:bg-amber-200"
                href="/quote"
              >
                Cotizar una idea similar
              </a>
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-5 text-stone-300">
          No hay piezas publicadas para esos filtros todavía.
        </p>
      ) : null}
    </section>
  );
}
