import type { Efecto } from "./types";

/** Franjas ([data-marquee]): bucle continuo (cada una en su sentido) que acelera e inclina con el scroll. */
export const franjas: Efecto = ({ gsap, ScrollTrigger, all }) => {
  all("[data-marquee]").forEach((track) => {
    const shift = -100 / Math.max(1, track.children.length);
    const reverse = Number(track.dataset.direction) < 0;
    const loop = gsap.fromTo(
      track,
      { xPercent: reverse ? shift : 0 },
      { xPercent: reverse ? 0 : shift, duration: 40, ease: "none", repeat: -1 },
    );
    const skewTo = gsap.quickTo(track, "skewX", { duration: 0.6, ease: "power3" });
    ScrollTrigger.create({
      trigger: track,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      onUpdate: (self) => {
        const v = self.getVelocity();
        const boost = 1 + Math.min(Math.abs(v) / 350, 5);
        gsap.fromTo(
          loop,
          { timeScale: self.direction * boost },
          { timeScale: self.direction, duration: 1.2, ease: "power2.out", overwrite: true },
        );
        skewTo(gsap.utils.clamp(-8, 8, v / -300));
        gsap.delayedCall(0.15, () => skewTo(0));
      },
    });
  });
};
