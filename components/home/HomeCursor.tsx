/**
 * Cursor "Ver" que sigue al puntero sobre las fotos de producto ([data-cursor]).
 * Lo anima useHomeMotion solo en escritorio con mouse; en táctil queda invisible.
 */
export function HomeCursor() {
  return (
    <div
      data-home-cursor
      aria-hidden
      className="pointer-events-none invisible fixed left-0 top-0 z-[60] grid h-20 w-20 place-items-center rounded-full bg-ink/90 text-[10px] font-semibold uppercase tracking-[0.25em] text-white opacity-0 shadow-xl shadow-ink/30 backdrop-blur-sm"
    >
      Ver
    </div>
  );
}
