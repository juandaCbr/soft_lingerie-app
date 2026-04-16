"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  layout?: "carousel" | "grid";
};

export function HomeProductCard({ prod, etiqueta, layout = "carousel" }: HomeProductCardProps) {
  const fotoUrl = withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb"));
  const [imgSrc, setImgSrc] = useState(fotoUrl);
  const slug = slugify(prod.nombre);

  useEffect(() => {
    setImgSrc(withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb")));
  }, [prod.id]);

  const gridLayout = layout === "grid";

  return (
    <Link
      href={`/productos/${slug}-${prod.id}`}
      className={
        gridLayout
          ? "w-full min-w-0 group flex flex-col"
          : "w-[45vw] md:w-[280px] flex-shrink-0 snap-start group flex flex-col"
      }
    >
      <div
        className={`relative aspect-[3/4] overflow-hidden shadow-sm bg-white border border-[#4a1d44]/5 ${
          gridLayout
            ? "rounded-xl sm:rounded-[1.25rem] md:rounded-[2rem] mb-2 sm:mb-3"
            : "rounded-[1.5rem] md:rounded-[2rem] mb-4"
        }`}
      >
        <Image
          src={imgSrc}
          alt={prod.nombre}
          fill
          sizes={
            gridLayout
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              : "(max-width: 768px) 45vw, 280px"
          }
          className="object-cover group-hover:scale-110 transition duration-700 ease-in-out"
          onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        />

        {prod.categoria && (
          <span
            className={`absolute bg-white/90 backdrop-blur-md text-[#4a1d44] font-black uppercase tracking-widest rounded-full shadow-sm z-10 ${
              gridLayout
                ? "top-2 left-2 text-[6px] sm:text-[7px] md:text-[9px] px-1.5 py-0.5 sm:px-2 sm:py-1 md:top-4 md:left-4 md:px-3 md:py-1.5"
                : "top-3 left-3 md:top-4 md:left-4 text-[7px] md:text-[9px] px-2 py-1 md:px-3 md:py-1.5"
            }`}
          >
            {typeof prod.categoria === "object" ? prod.categoria.nombre : prod.categoria}
          </span>
        )}

        <div
          className={`absolute bg-[#4a1d44] rounded-full font-black text-white z-10 tracking-widest ${
            gridLayout
              ? "bottom-2 left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 md:bottom-4 md:left-4 md:px-3 md:py-1.5 text-[7px] sm:text-[8px] md:text-[11px]"
              : "bottom-3 left-3 md:bottom-4 md:left-4 px-2 py-1 md:px-3 md:py-1.5 text-[9px] md:text-[11px]"
          }`}
        >
          {etiqueta}
        </div>
      </div>

      <div className={gridLayout ? "px-0.5 sm:px-1 min-w-0" : "px-1 md:px-2"}>
        <h3
          className={`font-bold text-[#4a1d44] uppercase tracking-tight min-w-0 ${
            gridLayout
              ? "text-[11px] leading-snug sm:text-xs md:text-sm lg:text-base line-clamp-2"
              : "text-base md:text-xl truncate"
          }`}
        >
          {prod.nombre}
        </h3>
        <p
          className={`text-[#4a1d44]/50 font-black mt-0.5 ${
            gridLayout ? "text-[11px] sm:text-xs md:text-sm lg:text-base" : "text-sm md:text-lg"
          }`}
        >
          ${Number(prod.precio).toLocaleString("es-CO")}
        </p>
      </div>
    </Link>
  );
}
