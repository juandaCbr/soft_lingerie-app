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

  const getSafeTimestamp = (value: string) => {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  const toNumericId = (id: string | number) => {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  };

  const sortByRecientes = (a: HomeProducto, b: HomeProducto) => {
    const diffFecha = getSafeTimestamp(b.created_at) - getSafeTimestamp(a.created_at);
    if (diffFecha !== 0) return diffFecha;
    return toNumericId(b.id) - toNumericId(a.id);
  };

  const normalizedGroupId = (p: HomeProducto) => {
    const gid = typeof p.grupo_id === "string" ? p.grupo_id.trim() : "";
    return gid.length > 0 ? `g:${gid}` : `id:${String(p.id)}`;
  };

  const productosAgrupados = useMemo(() => {
    const grouped = new Map<string, HomeProducto[]>();
    productos.forEach((p) => {
      const key = normalizedGroupId(p);
      const arr = grouped.get(key);
      if (arr) arr.push(p);
      else grouped.set(key, [p]);
    });

    const representativeByGroup = new Map<string, HomeProducto>();
    const variantIdsByGroup = new Map<string, Set<string>>();

    grouped.forEach((items, groupKey) => {
      const orderedItems = [...items].sort(sortByRecientes);
      representativeByGroup.set(groupKey, orderedItems[0]);
      variantIdsByGroup.set(groupKey, new Set(items.map((item) => String(item.id))));
    });

    return { representativeByGroup, variantIdsByGroup };
  }, [productos]);

  const novedades = useMemo(() => {
    return [...productosAgrupados.representativeByGroup.values()].sort(sortByRecientes).slice(0, 8);
  }, [productosAgrupados]);

  const masVendidos = useMemo(() => {
    const conteoVariante: { [key: string]: number } = {};

    ventas.forEach((v) => {
      if (v && Array.isArray(v.detalle_compra)) {
        v.detalle_compra.forEach((item) => {
          const id = item.id;
          if (id == null || id === "") return;
          const key = String(id);
          conteoVariante[key] = (conteoVariante[key] || 0) + (Number(item.quantity) || 1);
        });
      }
    });

    const conteoPorGrupo = new Map<string, number>();
    productosAgrupados.variantIdsByGroup.forEach((variantIds, groupKey) => {
      let total = 0;
      variantIds.forEach((variantId) => {
        total += conteoVariante[variantId] || 0;
      });
      if (total > 0) conteoPorGrupo.set(groupKey, total);
    });

    const conVentas = [...conteoPorGrupo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([groupKey]) => productosAgrupados.representativeByGroup.get(groupKey))
      .filter((p): p is HomeProducto => Boolean(p));

    if (conVentas.length === 0) {
      return [...productosAgrupados.representativeByGroup.values()].sort(sortByRecientes).slice(0, 8);
    }

    return conVentas.slice(0, 8);
  }, [productosAgrupados, ventas]);

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
