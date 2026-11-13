import type { Efecto } from "./types";

/**
 * Hero al bajar: cada capa viaja a su ritmo. La marca se queda atrás y las nubes delanteras
 * crecen hasta cubrirla (paso a la siguiente sección).
 */
export const heroScroll: Efecto = ({ gsap, root }) => {
  const hero = root.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;
  const layer = (name: string) => hero.querySelector(`[data-hero-layer="${name}"]`);
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.25 },
  });
  tl.to(layer("sky"), { yPercent: 18 }, 0)
    .to(layer("photo"), { yPercent: 14, scale: 1.04 }, 0)
    .to(layer("word"), { yPercent: 55, opacity: 0.35 }, 0)
    .to(layer("back"), { yPercent: -10 }, 0)
    .to(layer("front"), { yPercent: -45, scale: 1.15 }, 0)
    .to(hero.querySelector("[data-hero-stage]"), { scale: 0.96, transformOrigin: "50% 0%" }, 0);
};

/** Hero con mouse: las capas ([data-depth]) siguen al puntero con profundidad distinta. */
export const heroPuntero: Efecto = ({ gsap, root }) => {
  const stage = root.querySelector<HTMLElement>("[data-hero-stage]");
  if (!stage) return;
  const layers = Array.from(stage.querySelectorAll<HTMLElement>("[data-depth]")).map((el) => ({
    depth: Number(el.dataset.depth) || 0,
    x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3" }),
    y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3" }),
  }));
  const MAX = 44; // px de desplazamiento para la capa de profundidad 1
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    layers.forEach((l) => {
      l.x(nx * MAX * l.depth);
      l.y(ny * MAX * 0.6 * l.depth);
    });
  };
  const onLeave = () => layers.forEach((l) => (l.x(0), l.y(0)));
  stage.addEventListener("pointermove", onMove, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  return () => {
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
  };
};
