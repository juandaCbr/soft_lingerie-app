"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { slugify } from "@/app/lib/utils";
import {
  getProductoImage,
  withSupabaseListThumbnailParams,
  PLACEHOLDER_IMAGE,
} from "@/app/lib/image-helper";
import type { HomeProducto } from "@/app/lib/home-types";

type HomeProductCardProps = {
  prod: HomeProducto;
  etiqueta: string;
  /** arch: tarjeta en arco sobre fondo oscuro (Novedades) · grid: cuadrícula · feature: destacada grande */
  variant?: "arch" | "grid" | "feature";
};

const formatPrecio = (precio: HomeProducto["precio"]) => `$${Number(precio).toLocaleString("es-CO")}`;

export function HomeProductCard({ prod, etiqueta, variant = "grid" }: HomeProductCardProps) {
  // Siempre la versión "detail" (700px): la "thumb" mide 250px y se ve borrosa en tarjetas de 300px+
  const fotoUrl = withSupabaseListThumbnailParams(getProductoImage(prod, 0, "detail"));
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = imgFailed ? PLACEHOLDER_IMAGE : fotoUrl;
  const slug = slugify(prod.nombre);

  const href = `/productos/${slug}-${prod.id}`;
  const categoria = prod.categoria
    ? typeof prod.categoria === "object"
      ? prod.categoria.nombre
      : prod.categoria
    : null;

  const image = (sizes: string) => (
    <Image
      data-card-media
      src={imgSrc}
      alt={prod.nombre}
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
      onError={() => setImgFailed(true)}
    />
  );

  if (variant === "feature") {
    return (
      <Link
        href={href}
        data-reveal-card
        className="group relative col-span-2 flex min-h-[460px] flex-col justify-end overflow-hidden rounded-[2rem] bg-ink text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink lg:row-span-2 lg:min-h-0"
      >
        <div data-cursor className="absolute inset-0">
          {image("(max-width: 1024px) 100vw, 50vw")}
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="relative flex items-end justify-between gap-6 p-6 md:p-10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-accent">
              {etiqueta}
            </p>
            <h3 className="mt-3 font-display text-3xl font-bold leading-[0.95] tracking-[-0.03em] md:text-5xl">
              {prod.nombre}
            </h3>
            <p className="mt-3 font-display text-xl font-semibold text-brand-accent">{formatPrecio(prod.precio)}</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-500 group-hover:rotate-45">
            <ArrowUpRight size={22} aria-hidden />
          </span>
        </div>
      </Link>
    );
  }

  if (variant === "arch") {
    return (
      <Link
        href={href}
        data-reveal-card
        className="group flex w-[64vw] shrink-0 snap-start flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:w-[40vw] md:w-[280px] lg:w-[clamp(200px,30svh,280px)]"
      >
        <div
          data-cursor
          className="relative aspect-[3/4.2] overflow-hidden rounded-t-full rounded-b-[2rem] bg-white/10 ring-1 ring-white/15"
        >
          {image("(max-width: 768px) 64vw, 300px")}
          <span className="absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ink backdrop-blur-md">
            {etiqueta}
          </span>
        </div>
        <div className="mt-5 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-white">{prod.nombre}</h3>
            <p className="mt-0.5 font-display text-sm font-semibold text-white/60 md:text-base">{formatPrecio(prod.precio)}</p>
          </div>
          <span className="mt-0.5 shrink-0 rounded-full bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-ink transition duration-300 group-hover:bg-brand-accent">
            Ver
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-reveal-card
      className="group flex w-full min-w-0 flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <div data-cursor className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-blush/60">
        {image("(max-width: 1024px) 50vw, 25vw")}
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink backdrop-blur-md md:left-4 md:top-4">
          {etiqueta}
        </span>
      </div>
      <div className="mt-4 min-w-0 px-0.5">
        {categoria && (
          <p className="truncate text-xs font-semibold text-ink/50">{categoria}</p>
        )}
        <h3 className="mt-1 truncate font-display text-base font-semibold text-ink md:text-lg">
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
            {prod.nombre}
          </span>
        </h3>
        <p className="mt-0.5 font-display text-sm font-semibold text-ink/70 md:text-base">{formatPrecio(prod.precio)}</p>
      </div>
    </Link>
  );
}
