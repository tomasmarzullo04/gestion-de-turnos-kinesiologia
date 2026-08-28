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
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-primary dark:bg-card text-white dark:text-card-foreground lg:flex shadow-xl z-40 border-r dark:border-border">
        <div className="flex h-20 items-center border-b border-white/10 dark:border-border/40 px-6 gap-3">
          <BrandMark className="h-8 w-8 shrink-0 text-white dark:text-primary" />
          <div className="flex flex-col overflow-hidden">
            <span className="font-display font-bold text-base leading-tight tracking-tight text-white dark:text-foreground truncate">APEX</span>
            <span className="text-[10px] font-medium text-white/70 dark:text-muted-foreground uppercase tracking-widest leading-none truncate">
              {role === ROLES.ADMIN ? "Panel del profesional" : "Portal del socio"}
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-2 p-4 pt-8 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative overflow-hidden flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:focus-visible:ring-ring",
                  active
                    ? "bg-white/10 dark:bg-secondary/10 text-white dark:text-secondary shadow-sm"
                    : "text-white/70 dark:text-muted-foreground hover:bg-white/5 dark:hover:bg-muted hover:text-white dark:hover:text-foreground",
                )}
              >
                {/* Indicador activo: fondo sutil y barra lateral */}
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-1.5 bg-white dark:bg-secondary transition-all duration-300 ease-out-soft",
                    active ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
                  )}
                />
                <item.icon className={cn("h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110", active && "text-white dark:text-secondary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 dark:border-border/40 p-4 text-xs text-white/50 dark:text-muted-foreground/60 text-center">
          {role === ROLES.ADMIN ? "Panel del profesional" : "Portal del socio"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-muted/20">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8 shadow-sm">
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
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
