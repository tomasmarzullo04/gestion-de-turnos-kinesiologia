"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface Props {
  nav: NavItem[];
  homeHref: string;
  footer?: string;
}

/**
 * Navegación mobile como drawer lateral azul marino. Solo en pantallas chicas
 * (lg:hidden); en desktop se mantiene la sidebar. Usa Radix Dialog → overlay,
 * focus trap, cierre con Esc y bloqueo de scroll de fondo incluidos.
 */
export function MobileNav({ nav, homeHref, footer }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir menú de navegación"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none lg:hidden"
        />
        <Dialog.Content
          aria-label="Navegación"
          className="fixed inset-y-0 left-0 z-50 flex h-full w-[17rem] max-w-[85vw] flex-col bg-[#1b3a5b] text-white shadow-2xl duration-300 ease-out-soft focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left motion-reduce:animate-none motion-reduce:duration-0 lg:hidden"
        >
          <Dialog.Title className="sr-only">Menú de navegación</Dialog.Title>

          {/* Logo + cerrar */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <Link
              href={homeHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white"
            >
              <BrandMark className="h-9 w-9" animate={false} />
              <span>Apex</span>
            </Link>
            <Dialog.Close
              aria-label="Cerrar menú"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b9bd5]"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {/* Ítems */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b9bd5]",
                    active
                      ? "bg-[#5b9bd5] text-[#0f2438] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {footer && (
            <div className="border-t border-white/10 px-4 py-4 text-xs text-white/60">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
