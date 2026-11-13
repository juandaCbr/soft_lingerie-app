/** Ornamento editorial: línea — rombo — línea. */
export function HomeOrnament({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex items-center gap-3 ${className}`}>
      <span className="h-px w-12 bg-current opacity-40" />
      <span className="h-2 w-2 rotate-45 border border-current" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-2 w-2 rotate-45 border border-current" />
      <span className="h-px w-12 bg-current opacity-40" />
    </span>
  );
}

/** Sello circular con texto en arco; gira con el scroll si lleva data-spin (useHomeMotion). */
export function HomeSeal({
  text,
  className = "",
  children,
}: {
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const id = `sello-${text.length}`;
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`}>
      <svg data-spin viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <path id={id} d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <text className="fill-current font-display text-[13px] font-bold uppercase">
          <textPath href={`#${id}`} textLength="500" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      {children}
    </span>
  );
}
