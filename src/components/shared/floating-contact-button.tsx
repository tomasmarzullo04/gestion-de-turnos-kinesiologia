"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Instagram, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WHATSAPP_NUMBER = "5492235031870";
const WHATSAPP_MESSAGE = "Hola, quisiera consultar por los servicios y turnos disponibles en APEX.";
const IG_URL = "https://www.instagram.com/centro.apex/";

export function FloatingContactButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      className="fixed right-4 z-50 md:right-8"
      style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Opciones de contacto"
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              open && "scale-110 bg-primary/90"
            )}
          >
            {open ? (
              <X className="h-6 w-6" />
            ) : (
              <MessageCircle className="h-6 w-6" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={16}
          className="w-60 rounded-2xl p-2 shadow-xl border-border/50"
        >
          <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer focus:bg-muted mb-1">
            <Link href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.128.552 4.195 1.6 6.01L.027 23.957l6.069-1.593A11.96 11.96 0 0 0 12.031 24c6.645 0 12.03-5.385 12.03-12.03S18.677 0 12.031 0zm0 21.986c-1.8 0-3.559-.485-5.111-1.405l-.367-.217-3.799.997 1.015-3.706-.237-.378A9.972 9.972 0 0 1 2.046 11.97C2.046 6.472 6.533 1.985 12.031 1.985c5.497 0 9.985 4.487 9.985 9.985s-4.488 9.985-9.985 9.985zm5.485-7.498c-.301-.151-1.782-.879-2.059-.979-.277-.1-.478-.151-.679.151-.201.301-.779.979-.955 1.18-.176.201-.352.226-.653.075-2.091-1.042-3.473-1.921-4.838-3.953-.176-.263-.02-.405.13-.556.136-.137.301-.352.451-.527.151-.176.201-.301.301-.502.1-.201.05-.376-.025-.527-.075-.151-.679-1.631-.93-2.234-.244-.587-.492-.507-.679-.516-.176-.008-.377-.008-.578-.008s-.528.075-.804.376c-.276.301-1.055 1.03-1.055 2.512s1.08 2.914 1.231 3.115c.151.201 2.122 3.238 5.14 4.544 1.996.864 2.825.932 3.864.788.723-.1 2.234-.913 2.548-1.796.314-.882.314-1.637.22-1.797-.094-.16-.346-.26-.647-.41z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">WhatsApp</span>
                <span className="text-xs text-muted-foreground">Comunicate con soporte</span>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer focus:bg-muted">
            <Link href={IG_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-pink-600">
                <Instagram className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Instagram</span>
                <span className="text-xs text-muted-foreground">@centro.apex</span>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
