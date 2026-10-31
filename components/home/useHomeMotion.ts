"use client";

import { RefObject, useEffect } from "react";

/**
 * Capa de movimiento de la home: scroll suave (Lenis) + animaciones ligadas al scroll (GSAP).
 *
 * Rendimiento/SEO: GSAP y Lenis se importan de forma diferida, después del primer pintado,
 * así no entran en el JS crítico ni retrasan el LCP. Todo el contenido llega visible desde
 * el servidor; las animaciones solo se activan si el usuario no pidió "reducir movimiento".
 * Se declaran con data-attributes en el marcado de cada sección.
 */
export function useHomeMotion(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      // Scroll suave sincronizado con ScrollTrigger
      // lerp alto = respuesta rápida a la rueda (con 0.1 el scroll se sentía pesado)
      const lenis = new Lenis({ lerp: 0.2, wheelMultiplier: 1.1, anchors: { offset: -96 } });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const all = <T extends HTMLElement = HTMLElement>(selector: string) =>
        Array.from(root.querySelectorAll<T>(selector));
      const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
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

          // Hero: al bajar, cada capa viaja a su ritmo. La marca se queda atrás y las nubes
          // delanteras crecen hasta cubrirla (paso a la siguiente sección)
          const hero = root.querySelector<HTMLElement>("[data-hero]");
          if (hero) {
            const layer = (name: string) => hero.querySelector(`[data-hero-layer="${name}"]`);
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.25 },
            });
            tl.to(layer("sky"), { yPercent: 18 }, 0)
              .to(layer("word"), { yPercent: 55, opacity: 0.35 }, 0)
              .to(layer("back"), { yPercent: -10 }, 0)
              .to(layer("front"), { yPercent: -45, scale: 1.15 }, 0)
              .to(hero.querySelector("[data-hero-stage]"), { scale: 0.96, transformOrigin: "50% 0%" }, 0);
          }

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

          // Franjas: bucle continuo (cada una en su sentido) que acelera e inclina con el scroll
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
        });

        // Escritorio: Novedades se fija y los productos se desplazan en horizontal con el scroll
        mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
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
        });

        // Hero con mouse: las capas ([data-depth]) siguen al puntero con profundidad distinta
        mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
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
        });

        // Cursor "Ver" sobre las fotos de producto (solo mouse)
        mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
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
        });
      }, root);

      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
      };
    };

    // Arranca cuando el navegador queda libre (no compite con la carga inicial)
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void start(), { timeout: 1200 });

    return () => {
      disposed = true;
      cancelIdle(handle);
      cleanup();
    };
  }, [scope]);
}
