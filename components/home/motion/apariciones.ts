import type { Efecto } from "./types";

/** Títulos, bloques y tarjetas que aparecen al bajar (data-reveal-lines, data-reveal, data-reveal-card). */
export const apariciones: Efecto = ({ gsap, ScrollTrigger, all, belowFold }) => {
  // Títulos: cada línea sube desde una máscara (solo los que aún no se ven)
  all("[data-reveal-lines]").filter(belowFold).forEach((el) => {
    gsap.from(el.querySelectorAll("[data-line]"), {
      yPercent: 110,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  all("[data-reveal]").filter(belowFold).forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 24,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  // Tarjetas: aparición escalonada por lotes, con la foto "acercándose"
  const cards = all("[data-reveal-card]").filter(belowFold);
  gsap.set(cards, { autoAlpha: 0, y: 56 });
  ScrollTrigger.batch(cards, {
    start: "top 92%",
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.09, overwrite: true });
      gsap.from(
        batch.flatMap((card) => Array.from(card.querySelectorAll("[data-card-media]"))),
        { scale: 1.25, duration: 1.6, ease: "expo.out", stagger: 0.09 },
      );
    },
  });
};
