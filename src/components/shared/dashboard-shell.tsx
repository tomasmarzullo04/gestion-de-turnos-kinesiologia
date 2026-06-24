"use client";

import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Stethoscope,
  Users,
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
import { useRealtimeBookings } from "@/lib/hooks/use-realtime-bookings";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Asistencias", href: "/admin/asistencias", icon: ClipboardCheck },
  { label: "Plantillas", href: "/admin/plantillas", icon: CalendarClock },
  { label: "Pacientes", href: "/admin/pacientes", icon: Users },
  { label: "Profesionales", href: "/admin/profesionales", icon: Stethoscope },
];

const PATIENT_NAV: NavItem[] = [
  { label: "Inicio", href: "/portal", icon: LayoutDashboard },
  { label: "Reservar turno", href: "/portal/reservar", icon: CalendarPlus },
  { label: "Mis turnos", href: "/portal/turnos", icon: CalendarDays },
  { label: "Profesionales", href: "/portal/profesionales", icon: Stethoscope },
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

  // Escuchar nuevas reservas en tiempo real (solo admin)
  useRealtimeBookings(role);

  function isActive(href: string): boolean {
    if (href === homeHref) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/50 bg-gradient-to-b from-muted/20 to-transparent lg:flex">
        <div className="flex h-20 items-center gap-3 border-b px-6 font-semibold bg-card/80 backdrop-blur-sm">
          <BrandMark className="h-12 w-12" />
          <span className="font-display text-xl tracking-tight">Apex</span>
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
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  active
                    ? "bg-secondary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm",
                )}
              >
                {/* Indicador activo: barra de acento que crece (CSS, sin dep). */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-transform duration-300 ease-out-soft",
                    active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                  )}
                />
                <item.icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          {role === ROLES.ADMIN ? "Panel del profesional" : "Portal del socio"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
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
              <BrandMark className="h-10 w-10" animate={false} />
              <span className="text-lg">Apex</span>
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

        <main className="flex-1 p-4 lg:p-8 bg-muted/10">
          <div className="mx-auto w-full max-w-6xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
