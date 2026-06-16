"use client";

import type { ReactNode } from "react";

type ComunidadeSectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ComunidadeSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
}: ComunidadeSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 ${className}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="mb-3 sm:mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/75">
          {eyebrow}
        </p>
        <h3
          id={id ? `${id}-title` : undefined}
          className="mt-1 text-balance text-sm font-semibold text-amber-50/95 sm:text-base"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-1 max-w-prose text-[11px] leading-relaxed text-neutral-500">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
