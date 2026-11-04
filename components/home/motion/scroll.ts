import type { Efecto } from "./types";

/** Efectos ligados al scroll: parallax, barra de progreso, sello que gira, manifiesto y bloques que se abren. */
export const efectosScroll: Efecto = ({ gsap, root, all }) => {
  // Parallax: elementos decorativos con data-speed se desplazan a su propio ritmo
  all("[data-speed]").forEach((el) => {
    gsap.to(el, {
      yPercent: Number(el.dataset.speed) || -30,
      ease: "none",
      scrollTrigger: { trigger: el.closest("section") ?? el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // Barra de progreso de lectura
  const progressBar = root.querySelector<HTMLElement>("[data-scroll-progress]");
  if (progressBar) {
    gsap.to(progressBar, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.3 },
    });
  }

  // Sello circular que gira con el scroll
  all("[data-spin]").forEach((el) => {
    gsap.to(el, {
      rotation: 360,
      transformOrigin: "50% 50%",
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.5 },
    });
  });

  // Manifiesto: las palabras se "encienden" mientras se lee
  const manifesto = root.querySelector<HTMLElement>("[data-manifesto]");
  if (manifesto) {
    gsap.fromTo(
      manifesto.querySelectorAll("[data-word]"),
      { opacity: 0.14 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: manifesto, start: "top 78%", end: "bottom 50%", scrub: true },
      },
    );
  }

  // Bloques que se abren al entrar
  all("[data-scale-in]").forEach((el) => {
    gsap.fromTo(
      el,
      { scale: 0.92, y: 40 },
      { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 55%", scrub: true } },
    );
  });
};
