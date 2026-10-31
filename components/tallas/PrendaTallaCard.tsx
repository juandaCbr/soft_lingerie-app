import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { formatoPrecio, whatsappPedidoHref, type PrendaTalla } from "@/app/lib/catalogo-tallas";

const BOTON_PEDIR =
  "inline-flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink text-[13px] font-bold text-white shadow-lg shadow-ink/20 transition-colors hover:bg-brand-dark active:scale-[0.98] sm:text-sm";

/**
 * Botones de WhatsApp de una prenda. Si hay stock en varias tallas del enlace (XS y S), uno por
 * talla ("Pedir XS" / "Pedir S") para que el mensaje ya diga cuál quiere la clienta.
 */
function BotonesPedido({ prenda, tallaPorDefecto }: { prenda: PrendaTalla; tallaPorDefecto: string }) {
  if (prenda.tallas.length > 1) {
    return (
      <div className="flex gap-1.5 sm:gap-2">
        {prenda.tallas.map((t) => (
          <a
            key={t}
            href={whatsappPedidoHref(prenda, t)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Pedir ${prenda.nombre} en talla ${t} por WhatsApp`}
            className={`${BOTON_PEDIR} min-w-0 flex-1 px-2`}
          >
            <MessageCircle size={16} aria-hidden className="hidden shrink-0 sm:block" /> Pedir {t}
          </a>
        ))}
      </div>
    );
  }
  return (
    <a
      href={whatsappPedidoHref(prenda, prenda.tallas[0] ?? tallaPorDefecto)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BOTON_PEDIR} px-3 sm:gap-2 sm:px-4`}
    >
      <MessageCircle size={16} aria-hidden className="shrink-0" /> Pedir por WhatsApp
    </a>
  );
}

/** Tarjeta de una prenda en el catálogo por talla: foto con la talla, datos y botones de pedido. */
export function PrendaTallaCard({
  prenda,
  tallaPorDefecto,
  prioridad = false,
}: {
  prenda: PrendaTalla;
  /** Talla del enlace, por si la prenda no trae la suya */
  tallaPorDefecto: string;
  /** Las primeras fotos (las que se ven sin bajar) se cargan primero */
  prioridad?: boolean;
}) {
  return (
    <li className="flex flex-col">
      <Link
        href={prenda.href}
        className="group relative block aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-blush md:rounded-[1.75rem]"
      >
        <Image
          src={prenda.imagen}
          alt={prenda.nombre}
          fill
          sizes="(max-width: 1024px) 50vw, 25vw"
          priority={prioridad}
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
        {/* La talla queda en la foto: si la clienta toma captura, ya sale */}
        <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white md:left-4 md:top-4 md:text-sm">
          Talla {prenda.tallas.join(" · ")}
        </span>
      </Link>

      <div className="mt-3 flex flex-1 flex-col px-1">
        {prenda.categoria && <p className="text-xs font-semibold text-ink/50">{prenda.categoria}</p>}
        <h2 className="mt-0.5 text-base font-semibold leading-snug md:text-lg">{prenda.nombre}</h2>
        <p className="mt-1 text-lg font-bold tabular-nums">
          {formatoPrecio(prenda.precio)} <span className="text-xs font-medium text-ink/45">COP</span>
        </p>
        {prenda.colores.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
            {prenda.colores.map((c) => (
              <span key={c.nombre} className="inline-flex items-center gap-1">
                <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: c.hex || "#ccc" }} />
                {c.nombre}
              </span>
            ))}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <BotonesPedido prenda={prenda} tallaPorDefecto={tallaPorDefecto} />
          <Link
            href={prenda.href}
            className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-ink/60 transition-colors hover:text-ink"
          >
            Ver detalle <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
