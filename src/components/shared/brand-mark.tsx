import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Tamaño del contenedor (clases de Tailwind h-/w-). */
  className?: string;
  /** Propiedad mantenida por compatibilidad. */
  animate?: boolean;
}

/**
 * Sello de marca oficial de APEX.
 */
export function BrandMark({ className, animate = true }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src="https://res.cloudinary.com/dnfqkzxbp/image/upload/v1782304705/WhatsApp_Image_2026-06-24_at_09.13.03_n59urr.jpg"
        alt="APEX Logo"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
