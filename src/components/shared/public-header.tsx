"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    { href: "#inicio", label: "Inicio" },
    { href: "#servicios", label: "Servicios" },
    { href: "#experiencia", label: "Experiencia" },
    { href: "#beneficios", label: "Beneficios" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out bg-primary text-primary-foreground border-b border-primary-foreground/10",
        isScrolled
          ? "shadow-md py-3"
          : "shadow-sm py-4"
      )}
    >
      <div className="container max-w-[1240px] mx-auto">
        <div className="flex items-center justify-between">
          <Link href="#inicio" className="flex items-center gap-3 group">
            <BrandMark className="h-10 w-10 md:h-12 md:w-12 transition-transform group-hover:scale-105 bg-white rounded-md p-1" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight tracking-tight text-primary-foreground">APEX</span>
              <span className="text-[10px] font-medium text-primary-foreground/70 uppercase tracking-widest leading-none">Entrenamiento & Recovery</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <ul className="flex items-center gap-6 text-sm font-medium text-primary-foreground/80">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="font-medium text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-xl">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button asChild className="rounded-xl px-6 shadow-sm shadow-secondary/20 hover:shadow-md hover:shadow-secondary/30 transition-all bg-secondary text-secondary-foreground">
                <Link href="/register">Reservar turno</Link>
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-primary-foreground"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden absolute top-full left-0 w-full bg-primary border-b border-primary-foreground/10 shadow-lg transition-all duration-300 ease-in-out overflow-hidden origin-top",
          isMobileMenuOpen ? "opacity-100 max-h-screen py-6" : "opacity-0 max-h-0 py-0 border-transparent"
        )}
      >
        <div className="container max-w-[1240px] mx-auto flex flex-col gap-6">
          <ul className="flex flex-col gap-4 text-center">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-lg font-medium text-primary-foreground/80 py-2 hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <Button variant="outline" asChild className="w-full justify-center h-12 border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground rounded-xl">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Ingresar</Link>
            </Button>
            <Button asChild className="w-full justify-center rounded-xl h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>Reservar turno</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
