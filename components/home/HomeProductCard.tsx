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

export function HomeProductCard({ prod, etiqueta }: { prod: HomeProducto; etiqueta: string }) {
  const fotoUrl = withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb"));
  const [imgSrc, setImgSrc] = useState(fotoUrl);
  const slug = slugify(prod.nombre);

  useEffect(() => {
    setImgSrc(withSupabaseListThumbnailParams(getProductoImage(prod, 0, "thumb")));
  }, [prod.id]);

  return (
    <Link
      href={`/productos/${slug}-${prod.id}`}
      className="w-[45vw] md:w-[280px] flex-shrink-0 snap-start group flex flex-col"
    >
      <div className="relative aspect-[3/4] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden mb-4 shadow-sm bg-white border border-[#4a1d44]/5">
        <Image
          src={imgSrc}
          alt={prod.nombre}
          fill
          sizes="(max-width: 768px) 45vw, 280px"
          className="object-cover group-hover:scale-110 transition duration-700 ease-in-out"
          onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        />

        {prod.categoria && (
          <span className="absolute top-3 left-3 md:top-4 md:left-4 bg-white/90 backdrop-blur-md text-[#4a1d44] text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-sm z-10">
            {typeof prod.categoria === "object" ? prod.categoria.nombre : prod.categoria}
          </span>
        )}

        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 bg-[#4a1d44] px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[7px] md:text-[8px] font-black text-white z-10 tracking-widest">
          {etiqueta}
        </div>
      </div>

      <div className="px-1 md:px-2">
        <h3 className="font-bold text-[11px] md:text-base text-[#4a1d44] truncate uppercase tracking-tight">
          {prod.nombre}
        </h3>
        <p className="text-[#4a1d44]/50 text-[10px] md:text-sm font-black mt-0.5">
          ${Number(prod.precio).toLocaleString("es-CO")}
        </p>
      </div>
    </Link>
  );
}
