const ITEMS_A = ["Lencería exclusiva", "Conjuntos", "Bodies", "Valledupar", "Hecho para resaltar tu belleza"];
const ITEMS_B = ["Envíos a toda Colombia", "Pago seguro", "Asesoría personalizada", "Diseños exclusivos"];

function MarqueeRow({ items, hidden = false }: { items: string[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li key={item} className="flex items-center">
          <span
            className={`px-8 ${
              i % 2 === 0
                ? "font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl"
                : "font-display text-3xl font-bold tracking-[-0.02em] text-outline md:text-4xl"
            }`}
          >
            {item}
          </span>
          <span aria-hidden className="h-2 w-2 rotate-45 bg-current opacity-60" />
        </li>
      ))}
    </ul>
  );
}

function Band({ items, direction, className }: { items: string[]; direction: 1 | -1; className: string }) {
  return (
    <div className={`overflow-hidden py-4 md:py-5 ${className}`}>
      <div data-marquee data-direction={direction} className="flex w-max will-change-transform">
        <MarqueeRow items={items} />
        <MarqueeRow items={items} hidden />
        <MarqueeRow items={items} hidden />
      </div>
    </div>
  );
}

/**
 * Dos franjas cruzadas que corren en sentidos opuestos y reaccionan a la velocidad del scroll
 * (useHomeMotion). Con "reducir movimiento" quedan estáticas.
 */
export function HomeMarquee() {
  return (
    <div className="relative overflow-hidden bg-cream py-10 md:py-14">
      <Band items={ITEMS_A} direction={1} className="relative z-10 -rotate-2 scale-[1.04] bg-ink text-white shadow-2xl shadow-ink/30" />
      <Band items={ITEMS_B} direction={-1} className="-mt-6 rotate-[1.5deg] scale-[1.04] bg-brand-primary text-ink md:-mt-8" />
    </div>
  );
}
