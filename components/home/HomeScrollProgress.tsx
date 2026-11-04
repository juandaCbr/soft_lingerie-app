/** Barra fina de progreso de lectura en el borde superior (la anima useHomeMotion). */
export function HomeScrollProgress() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div data-scroll-progress className="h-full origin-left scale-x-0 bg-gradient-to-r from-brand-dark to-ink" />
    </div>
  );
}
