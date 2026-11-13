import type gsapDefault from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

/**
 * Lo que recibe cada efecto de la home. Los tipos se importan con `import type` (se borran al compilar),
 * así GSAP sigue cargándose de forma diferida desde useHomeMotion y no entra en el JS inicial.
 */
export type MotionCtx = {
  gsap: typeof gsapDefault;
  ScrollTrigger: typeof ScrollTriggerType;
  /** Contenedor de la home */
  root: HTMLElement;
  /** querySelectorAll dentro de la home, como array */
  all: <T extends HTMLElement = HTMLElement>(selector: string) => T[];
  /** true si el elemento empieza debajo de la pantalla (los visibles al cargar no se animan) */
  belowFold: (el: Element) => boolean;
};

/** Un efecto puede devolver su limpieza (quitar listeners, data-attributes…). */
export type Efecto = (ctx: MotionCtx) => void | (() => void);
