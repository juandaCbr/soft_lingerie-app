import type { Efecto } from "./types";

/** Escritorio: Novedades se fija y los productos se desplazan en horizontal con el scroll. */
export const novedadesHorizontal: Efecto = ({ gsap, root }) => {
  const section = root.querySelector<HTMLElement>("[data-hscroll]");
  const viewport = section?.querySelector<HTMLElement>("[data-hscroll-viewport]");
  const track = section?.querySelector<HTMLElement>("[data-hscroll-track]");
  if (!section || !viewport || !track) return;

  root.dataset.hscroll = "on";
  viewport.scrollLeft = 0;
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const progress = section.querySelector<HTMLElement>("[data-hscroll-progress]");
  const count = section.querySelector<HTMLElement>("[data-hscroll-count]");
  const totalCards = track.children.length;
  let lastIndex = 1;
  const onProgress = (p: number) => {
    if (progress) gsap.set(progress, { scaleX: p });
    const index = Math.min(totalCards, Math.max(1, Math.round(p * (totalCards - 1)) + 1));
    if (count && index !== lastIndex) {
      lastIndex = index;
      count.textContent = String(index).padStart(2, "0");
    }
  };

  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate: (self) => onProgress(self.progress),
    },
  });

  return () => {
    delete root.dataset.hscroll;
  };
};
