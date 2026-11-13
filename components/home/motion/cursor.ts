import type { Efecto } from "./types";

/** Cursor "Ver" sobre las fotos de producto ([data-cursor]); solo con mouse. */
export const cursorVer: Efecto = ({ gsap, root }) => {
  const cursor = root.querySelector<HTMLElement>("[data-home-cursor]");
  if (!cursor) return;
  gsap.set(cursor, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 1 });
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.5, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.5, ease: "power3" });
  let visible = false;
  const show = (on: boolean) => {
    if (on === visible) return;
    visible = on;
    gsap.to(cursor, { scale: on ? 1 : 0, duration: 0.45, ease: on ? "back.out(1.6)" : "power3.out", overwrite: "auto" });
  };
  const onMove = (e: PointerEvent) => {
    xTo(e.clientX);
    yTo(e.clientY);
    show(Boolean((e.target as Element | null)?.closest?.("[data-cursor]")));
  };
  // Al hacer scroll sin mover el mouse la tarjeta bajo el puntero cambia: se oculta
  const onScroll = () => show(false);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    gsap.set(cursor, { autoAlpha: 0 });
  };
};
