import Image from "next/image";

/**
 * Banco de nubes rosadas: foto real de cúmulos (Pexels, licencia libre) separada del cielo
 * y teñida con la rampa de la marca (sombra rosa → blanco), en WebP con transparencia.
 * Llena su contenedor anclada arriba, así siempre se ven las crestas y el borde inferior
 * puede quedar fuera del encuadre.
 */
const NUBE = { src: "/images/nube-rosa.webp", width: 2400, height: 1227 };

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
}: {
  className?: string;
  centerLobe?: boolean;
  imgClassName?: string;
}) {
  const img = (pos: string, flip = false) => (
    <Image
      src={NUBE.src}
      alt=""
      width={NUBE.width}
      height={NUBE.height}
      sizes="(max-width: 768px) 200vw, 60vw"
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
  sizes = "100vw",
}: {
  className?: string;
  /** Espejo horizontal, para que dos bancos no se vean iguales */
  flip?: boolean;
  /** Nubes sueltas: difumina los bordes para que la foto no se vea cortada en recto */
  fade?: boolean;
  sizes?: string;
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
        sizes={sizes}
        className={`object-cover object-top ${flip ? "-scale-x-100" : ""}`}
      />
    </div>
  );
}
