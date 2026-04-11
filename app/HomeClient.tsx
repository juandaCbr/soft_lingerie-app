"use client";

import { useMemo, useRef, useState } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNovedadesSection } from "@/components/home/HomeNovedadesSection";
import { HomeFavoritosSection } from "@/components/home/HomeFavoritosSection";
import { HomePageClosing } from "@/components/home/HomePageClosing";
import type { HomeProducto, VentaDetalleHome } from "@/app/lib/home-types";

type HomeClientProps = {
  productosIniciales: HomeProducto[];
  ventasIniciales: VentaDetalleHome[];
};

export default function HomeClient({ productosIniciales, ventasIniciales }: HomeClientProps) {
  const [productos] = useState<HomeProducto[]>(productosIniciales);
  const [ventas] = useState<VentaDetalleHome[]>(ventasIniciales);

  const scrollNovedades = useRef<HTMLDivElement>(null);
  const scrollFavoritos = useRef<HTMLDivElement>(null);

  const novedades = useMemo(() => {
    return [...productos]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [productos]);

  const masVendidos = useMemo(() => {
    const conteo: { [key: string]: number } = {};

    ventas.forEach((v) => {
      if (v && Array.isArray(v.detalle_compra)) {
        v.detalle_compra.forEach((item) => {
          const id = item.id;
          if (id == null || id === "") return;
          const key = String(id);
          conteo[key] = (conteo[key] || 0) + (Number(item.quantity) || 1);
        });
      }
    });

    const conVentas = [...productos]
      .filter((p) => {
        const k = String(p.id);
        return conteo[k] && conteo[k] > 0;
      })
      .sort((a, b) => conteo[String(b.id)] - conteo[String(a.id)]);

    if (conVentas.length === 0) {
      return [...productos]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);
    }

    return conVentas.slice(0, 8);
  }, [productos, ventas]);

  const scrollHorizontal = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      ref.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#fdf8f6] min-h-screen w-full overflow-x-hidden">
      <HomeHero />
      <HomeNovedadesSection
        novedades={novedades}
        scrollRef={scrollNovedades}
        onScroll={(dir) => scrollHorizontal(scrollNovedades, dir)}
      />
      <HomeFavoritosSection
        masVendidos={masVendidos}
        scrollRef={scrollFavoritos}
        onScroll={(dir) => scrollHorizontal(scrollFavoritos, dir)}
      />
      <HomePageClosing />
    </div>
  );
}
