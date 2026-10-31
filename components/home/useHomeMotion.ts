"use client";

import { RefObject, useEffect } from "react";
import type { Efecto, MotionCtx } from "./motion/types";
import { apariciones } from "./motion/apariciones";
import { heroPuntero, heroScroll } from "./motion/hero";
import { efectosScroll } from "./motion/scroll";
import { franjas } from "./motion/franjas";
import { novedadesHorizontal } from "./motion/novedades-horizontal";
import { cursorVer } from "./motion/cursor";

/**
 * Capa de movimiento de la home: scroll suave (Lenis) + animaciones ligadas al scroll (GSAP).
 *
 * Rendimiento/SEO: GSAP y Lenis se importan de forma diferida, después del primer pintado,
 * así no entran en el JS crítico ni retrasan el LCP. Todo el contenido llega visible desde
 * el servidor; las animaciones solo se activan si el usuario no pidió "reducir movimiento".
 * Se declaran con data-attributes en el marcado de cada sección.
 *
 * Cada efecto vive en ./motion; aquí solo se decide en qué condiciones se activa cada uno.
 * Para agregar uno nuevo: crear su archivo en ./motion y sumarlo a EFECTOS.
 */
const SIN_REDUCIR = "(prefers-reduced-motion: no-preference)";
const CON_MOUSE = `(hover: hover) and (pointer: fine) and ${SIN_REDUCIR}`;

const EFECTOS: [condicion: string, efectos: Efecto[]][] = [
  [SIN_REDUCIR, [apariciones, heroScroll, efectosScroll, franjas]],
  [`(min-width: 1024px) and ${SIN_REDUCIR}`, [novedadesHorizontal]],
  [CON_MOUSE, [heroPuntero]],
  [CON_MOUSE, [cursorVer]],
];

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

      const motion: MotionCtx = {
        gsap,
        ScrollTrigger,
        root,
        all: <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector)),
        belowFold: (el: Element) => el.getBoundingClientRect().top > window.innerHeight,
      };

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        for (const [condicion, efectos] of EFECTOS) {
          mm.add(condicion, () => {
            const limpiezas = efectos.map((efecto) => efecto(motion));
            return () => limpiezas.forEach((limpiar) => limpiar?.());
          });
        }
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
