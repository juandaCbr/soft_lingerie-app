import type { ReactNode } from "react";
import { HomeCloud, HomeCloudBank } from "@/components/home/HomeCloud";

/**
 * Panel con el cielo rosa de la marca: nubes sueltas en las esquinas y un banco de nubes abajo.
 * Es el encabezado de las páginas (carrito, contacto, catálogo, tallas…) y el fondo de login/registro.
 *
 * - `variante="seccion"`: encabezado; el banco de nubes pasa por DELANTE del borde inferior del contenido.
 * - `variante="pagina"`: fondo de pantalla completa; todas las nubes quedan DETRÁS del contenido.
 * - `banco`: altura donde empiezan las nubes de abajo (clase `top-[..%]`).
 * - `className`: tamaño, padding y alineación propios de cada página.
 */
const ESQUINAS = {
  seccion: {
    izquierda: "left-[-5%] top-[8%] aspect-[2/1] w-[36%] opacity-60 md:w-[14%]",
    derecha: "right-[-4%] top-[4%] aspect-[2/1] w-[30%] opacity-50 md:w-[12%]",
    banco: "",
  },
  pagina: {
    izquierda: "left-[-5%] top-[8%] -z-10 aspect-[2/1] w-[40%] opacity-60 md:w-[16%]",
    derecha: "right-[-4%] top-[4%] -z-10 aspect-[2/1] w-[34%] opacity-50 md:w-[13%]",
    banco: "-z-10",
  },
} as const;

export function CieloRosa({
  as: Tag = "div",
  variante = "seccion",
  banco = "top-[80%]",
  className = "",
  children,
}: {
  as?: "div" | "main" | "header" | "section";
  variante?: keyof typeof ESQUINAS;
  banco?: string;
  className?: string;
  children: ReactNode;
}) {
  const nubes = ESQUINAS[variante];
  return (
    <Tag className={`relative isolate overflow-hidden rounded-[1.75rem] bg-cielo md:rounded-[2.75rem] ${className}`}>
      <HomeCloud fade className={nubes.izquierda} />
      <HomeCloud fade flip className={nubes.derecha} />
      {children}
      <HomeCloudBank className={`inset-x-0 bottom-0 ${banco} ${nubes.banco}`} />
    </Tag>
  );
}
