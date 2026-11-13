import type { ReactNode } from "react";

type HomeSectionHeaderProps = {
  /** Palabra gigante y desvanecida detrás del título (eco de SOFT en el hero) */
  watermark: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** light: crema · pink: rosa de marca · dark: fondos oscuros */
  tone?: "light" | "pink" | "dark";
};

/** Encabezado de sección: palabra de marca gigante detrás + antetítulo + título + descripción. */
export function HomeSectionHeader({ watermark, eyebrow, title, description, action, tone = "light" }: HomeSectionHeaderProps) {
  const dark = tone === "dark";
  const onPink = tone === "pink";
  return (
    <div className="relative mb-12 flex flex-col gap-8 md:mb-16 md:flex-row md:items-end md:justify-between">
      <span
        aria-hidden
        data-speed="-20"
        // w-max + nowrap: el degradado de texto solo pinta dentro de la caja, así que la caja debe medir toda la palabra
        className={`pointer-events-none absolute -top-20 left-[-0.04em] w-max select-none whitespace-nowrap pr-[0.14em] font-display text-[clamp(6rem,17vw,16rem)] font-extrabold leading-[0.8] tracking-[-0.06em] md:-top-28 ${
          dark ? "text-wordmark opacity-25" : onPink ? "text-wordmark opacity-80" : "text-wordmark-blush"
        }`}
      >
        {watermark}
      </span>
      <div className="relative max-w-xl">
        <p data-reveal className={`text-sm font-semibold ${dark ? "text-white/70" : "text-brand-dark"}`}>
          {eyebrow}
        </p>
        <h2
          data-reveal-lines
          className={`mt-3 font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl ${dark ? "text-white" : "text-ink"}`}
        >
          <span className="block overflow-hidden pb-[0.08em]">
            <span data-line className="block">
              {title}
            </span>
          </span>
        </h2>
        {description && (
          <p
            data-reveal
            className={`mt-5 text-base font-medium leading-relaxed md:text-lg ${dark ? "text-white/70" : "text-ink/70"}`}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div data-reveal className="relative">
          {action}
        </div>
      )}
    </div>
  );
}
