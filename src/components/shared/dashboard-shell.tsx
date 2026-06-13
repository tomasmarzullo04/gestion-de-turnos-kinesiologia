"use client";

import {
  Activity,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  Clock,
  LayoutDashboard,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { label: "Turnos", href: "/admin/turnos", icon: CalendarDays },
  { label: "Servicios", href: "/admin/servicios", icon: Briefcase },
  { label: "Profesionales", href: "/admin/profesionales", icon: Users },
  { label: "Disponibilidad", href: "/admin/disponibilidad", icon: Clock },
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
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span className="text-lg">Kiné</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
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
              className="flex items-center gap-2 font-semibold lg:hidden"
            >
              <Activity className="h-5 w-5 text-primary" />
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
