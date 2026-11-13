import Image from "next/image";

/**
 * Logo de Soft Lingerie en círculo, para encabezados de catálogo (catálogo de la tienda y por tallas).
 * El archivo es de 150 px: se muestra a máx. 72 px para que se vea nítido en pantallas retina.
 */
export function LogoMarca({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="Soft Lingerie"
      width={150}
      height={150}
      className={`mx-auto h-16 w-16 rounded-full object-cover shadow-xl shadow-ink/15 ring-4 ring-white/80 md:h-[72px] md:w-[72px] ${className}`}
    />
  );
}
