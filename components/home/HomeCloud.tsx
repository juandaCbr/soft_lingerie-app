import Image from "next/image";

/**
 * Banco de nubes rosadas: foto real de cúmulos (Pexels, licencia libre) separada del cielo
 * y teñida con la rampa de la marca (sombra rosa → blanco), en WebP con transparencia.
 * Llena su contenedor anclada arriba, así siempre se ven las crestas y el borde inferior
 * puede quedar fuera del encuadre.
 *
 * Rendimiento: el archivo ya viene optimizado (1600 px, ~60 KB) y se sirve tal cual (`unoptimized`).
 * Pasado por el optimizador de Next salía en ~285 KB, porque la transparencia infla el WebP.
 */
const NUBE = { src: "/images/nube-rosa.webp", width: 1600, height: 818 };

/**
 * Banco de nubes escalado por ALTO (no por ancho): las crestas quedan siempre a la altura
 * del borde superior del contenedor, sea cual sea el ancho de la pantalla. Tres copias
 * (centro + lados en espejo) cubren pantallas anchas sin estirar la foto.
 * `centerLobe` desplaza la copia central para que una cresta (y no el valle) quede al centro.
 */
export function HomeCloudBank({
  className = "",
  centerLobe = false,
  imgClassName = "",
  preload = false,
}: {
  className?: string;
  centerLobe?: boolean;
  imgClassName?: string;
  /** Bancos del hero: se ven al abrir la página, así que se cargan primero (mejora el LCP) */
  preload?: boolean;
}) {
  const img = (pos: string, flip = false) => (
    <Image
      src={NUBE.src}
      alt=""
      width={NUBE.width}
      height={NUBE.height}
      unoptimized
      preload={preload}
      className={`absolute h-[300%] w-auto max-w-none ${flip ? "-scale-x-100" : ""} ${pos} ${imgClassName}`}
    />
  );
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {img("right-[54%] top-[16%]", true)}
      {img("left-[54%] top-[10%]", true)}
      {img(centerLobe ? "left-1/2 top-0 -translate-x-[22%]" : "left-1/2 top-0 -translate-x-1/2")}
    </div>
  );
}

export function HomeCloud({
  className = "",
  flip = false,
  fade = false,
}: {
  className?: string;
  /** Espejo horizontal, para que dos bancos no se vean iguales */
  flip?: boolean;
  /** Nubes sueltas: difumina los bordes para que la foto no se vea cortada en recto */
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${fade ? "[mask-image:radial-gradient(50%_50%_at_50%_50%,black_45%,transparent_100%)]" : ""} ${className}`}
    >
      <Image
        src="/images/nube-rosa.webp"
        alt=""
        fill
        unoptimized
        className={`object-cover object-top ${flip ? "-scale-x-100" : ""}`}
      />
    </div>
  );
}
