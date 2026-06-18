"use client";

import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  Menu,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Agenda", href: "/admin/agenda", icon: CalendarDays },
  { label: "Plantillas", href: "/admin/plantillas", icon: CalendarClock },
];

const PATIENT_NAV: NavItem[] = [
  { label: "Inicio", href: "/portal", icon: LayoutDashboard },
  { label: "Reservar turno", href: "/portal/reservar", icon: CalendarPlus },
  { label: "Mis turnos", href: "/portal/turnos", icon: CalendarDays },
];

interface DashboardShellProps {
  role: Role;
  user: { name: string; email: string };
  children: React.ReactNode;
}

export function DashboardShell({ role, user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const nav = role === ROLES.ADMIN ? ADMIN_NAV : PATIENT_NAV;
  const homeHref = role === ROLES.ADMIN ? "/admin" : "/portal";
  const profileHref = role === ROLES.PATIENT ? "/portal/perfil" : undefined;

  function isActive(href: string): boolean {
    if (href === homeHref) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
          <BrandMark />
          <span className="font-display text-lg tracking-tight">Kiné</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {/* Indicador activo: barra de acento que crece (CSS, sin dep). */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-transform duration-200 ease-out-soft",
                    active ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          {role === ROLES.ADMIN ? "Panel de administración" : "Portal del paciente"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile nav */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {nav.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={homeHref}
              className="flex items-center gap-2 font-display font-semibold tracking-tight lg:hidden"
            >
              <BrandMark className="h-7 w-7" animate={false} />
              Kiné
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              profileHref={profileHref}
            />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto w-full max-w-6xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
