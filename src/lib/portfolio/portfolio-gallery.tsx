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
    <section className="pb-10" aria-label="Portafolio de trabajos">
      <div className="grid border border-[#cec6c2]/14 bg-[#181818] md:grid-cols-2">
        <label className="border-b border-[#cec6c2]/14 p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#837f7c] md:border-b-0 md:border-r">
          <span className="mb-2 block">Estilo</span>
          <select
            className="w-full border border-[#cec6c2]/18 bg-[#202020] px-4 py-3 text-sm text-[#cec6c2] outline-none transition focus:border-[#cec6c2]"
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

        <label className="p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#837f7c]">
          <span className="mb-2 block">Etiqueta</span>
          <select
            className="w-full border border-[#cec6c2]/18 bg-[#202020] px-4 py-3 text-sm text-[#cec6c2] outline-none transition focus:border-[#cec6c2]"
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

      <div className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item, index) => (
          <article
            className="group border-b border-[#cec6c2]/14 md:border-r lg:[&:nth-child(3n)]:border-r-0"
            key={item.id}
          >
            <div
              className="relative h-80 overflow-hidden border-b border-[#cec6c2]/14 bg-[#202020]"
              style={item.imageUrl ? undefined : { background: item.gradient }}
            >
              {item.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover grayscale-[0.05] transition duration-500 group-hover:scale-[1.025]"
                    src={item.imageUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#141414]/70" />
                </>
              ) : null}
              <div className="absolute left-4 top-4 bg-[#141414] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#cec6c2]">
                WORK/{String(index + 1).padStart(2, "0")}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#b7aaa4]">{item.style}</p>
                <h2 className="neo-display mt-2 max-w-[14ch] text-3xl text-[#cec6c2]">{item.title}</h2>
              </div>
            </div>

            <div className="flex min-h-64 flex-col p-5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#66615e]">
                Zona / {item.bodyArea}
              </p>
              <p className="mt-5 text-sm leading-7 text-[#837f7c]">{item.description}</p>
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#b7aaa4]">
                {item.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              <a
                className="mt-auto pt-7 text-[10px] font-bold uppercase tracking-[0.12em] text-[#cec6c2] transition hover:text-white"
                href="/quote"
              >
                Cotizar idea similar →
              </a>
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="mt-4 border border-[#cec6c2]/14 bg-[#181818] p-5 text-sm text-[#837f7c]">
          No hay piezas publicadas para esos filtros todavía.
        </p>
      ) : null}
    </section>
  );
}
