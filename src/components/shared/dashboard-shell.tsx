"use client";

import {
  Ban,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  LayoutDashboard,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { MobileNav } from "@/components/shared/mobile-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
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
  { label: "Cargar turno", href: "/admin/cargar-turno", icon: CalendarPlus },
  { label: "Plantillas", href: "/admin/plantillas", icon: CalendarClock },
  { label: "Bloqueos", href: "/admin/bloqueos", icon: Ban },
  { label: "Pacientes", href: "/admin/pacientes", icon: Users },
  { label: "Finanzas", href: "/admin/finanzas", icon: Wallet },
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
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card/40 lg:flex">
        <div className="flex h-16 items-center border-b px-6 bg-card/60 backdrop-blur-md gap-3">
          <BrandMark className="h-8 w-8 shrink-0" />
          <div className="flex flex-col overflow-hidden">
            <span className="font-display font-bold text-base leading-tight tracking-tight text-foreground truncate">APEX</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-none truncate">
              {role === ROLES.ADMIN ? "Panel del profesional" : "Portal del socio"}
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-4 p-4 pt-10">
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
                {/* Indicador activo: fondo sutil y barra lateral */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-full w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 ease-out-soft",
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

      <div className="flex min-w-0 flex-1 flex-col bg-muted/20">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Mobile nav (drawer azul marino) */}
            <MobileNav
              nav={nav}
              homeHref={homeHref}
              footer={role === ROLES.ADMIN ? "Panel del profesional" : "Portal del socio"}
            />
            <Link
              href={homeHref}
              className="flex items-center gap-2 font-display font-semibold tracking-tight lg:hidden"
            >
              <BrandMark className="h-8 w-8" animate={false} />
              <span className="font-display font-bold text-lg text-foreground">APEX</span>
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
