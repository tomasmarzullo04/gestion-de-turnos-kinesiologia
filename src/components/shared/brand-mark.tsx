import { type CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Tamaño del cuadrado contenedor (clases de Tailwind h-/w-). */
  className?: string;
  /** Animar el trazo del pulso al montar. Por defecto true. */
  animate?: boolean;
}

/**
 * Sello de marca de Kiné: el cuadrado teal con la "línea de pulso" que se
 * dibuja sola al cargar (stroke-dashoffset). Es la única pieza con audacia;
 * el resto de la UI se mantiene callado. Respeta prefers-reduced-motion
 * (la animación se neutraliza globalmente en globals.css).
 */
export function BrandMark({ className, animate = true }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-e1",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        role="img"
      >
        <path
          d="M1 12.5 H6 L8.5 6 L11.5 18.5 L14 9.5 L16 14 H23"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          // pathLength normaliza el largo a 48 → la animación va de 48 a 0.
          pathLength={48}
          strokeDasharray={animate ? 48 : undefined}
          style={
            animate
              ? ({ "--pulse-length": "48" } as CSSProperties)
              : undefined
          }
          className={animate ? "animate-draw-line" : undefined}
        />
      </svg>
    </span>
  );
}
