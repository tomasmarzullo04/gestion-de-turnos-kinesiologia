import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Clock,
  History,
  Lightbulb,
  User,
  Activity
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LocationMapCard } from "@/components/features/location-map-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BookingStatus } from "@/lib/booking-config";
import { requirePatient } from "@/lib/auth/session";
import { formatDateKey, formatDateKeyShort } from "@/lib/datetime";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const user = await requirePatient();
  const bookings = await bookingService.listForUser(user.id);

  const now = Date.now();
  const upcomingSorted = bookings
    .filter(
      (b) => b.status === "CONFIRMED" && new Date(b.startsAtISO).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime(),
    );
  const recentDone = bookings
    .filter(
      (b) => b.status === "CONFIRMED" && new Date(b.startsAtISO).getTime() < now,
    )
    .slice(0, 3);

  const next = upcomingSorted[0]; // el más cercano
  const pendientes = upcomingSorted.length;
  const realizados = bookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.startsAtISO).getTime() < now,
  ).length;

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="space-y-8 stagger-children">
      {/* 1. Tarjeta de bienvenida inmersiva */}
      <section className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-lg">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/apex-training-floor.jpeg"
            alt="Fondo APEX"
            fill
            className="object-cover opacity-10 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"></div>
        </div>
        <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">¡Hola, {firstName}! 👋</h1>
            <p className="max-w-xl text-primary-foreground/80 text-lg">
              Bienvenido a tu portal. Gestioná tus sesiones de entrenamiento y recuperación desde acá.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="rounded-full shadow-md w-full sm:w-auto h-12 px-6">
            <Link href="/portal/reservar">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Reservar turno
            </Link>
          </Button>
        </div>
      </section>

      {/* 2. Resumen (Stat Cards) */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Próximo turno"
          value={next ? formatDateKeyShort(next.date) : "—"}
          icon={CalendarCheck}
        />
        <StatCard
          label="Turnos pendientes"
          value={pendientes}
          icon={CalendarDays}
        />
        <StatCard
          label="Turnos realizados"
          value={realizados}
          icon={History}
        />
      </section>

      {/* Ubicación del consultorio (Ancho completo) */}
      <LocationMapCard />

      <div className="grid gap-6 md:grid-cols-7">
        {/* Columna Izquierda (Próximo Turno + Acciones Rápidas) */}
        <div className="flex flex-col gap-6 md:col-span-4 lg:col-span-5">
          {/* 3. Próximo turno */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Tu próximo turno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {next ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/10 bg-primary/5 p-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize text-xl text-primary">
                        {formatDateKey(next.date)}
                      </span>
                      <StatusBadge status={next.status as BookingStatus} />
                    </div>
                    <p className="flex items-center gap-1.5 tabular-nums text-muted-foreground font-medium">
                      <Clock className="h-4 w-4" />
                      {next.startTime} – {next.endTime} hs
                    </p>
                  </div>
                  <Button variant="default" className="rounded-full shadow-sm" asChild>
                    <Link href="/portal/turnos">Ver detalle</Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="Todavía no tenés ningún turno reservado."
                  description="Empezá reservando tu primer turno de entrenamiento."
                  action={
                    <Button asChild size="lg" className="mt-2 rounded-full shadow-sm">
                      <Link href="/portal/reservar">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Ver horarios disponibles
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* 4. Acciones rápidas */}
          <section>
            <h2 className="mb-4 text-xl font-bold tracking-tight">Acciones rápidas</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card interactive asChild className="rounded-2xl border-border/50 group">
                <Link href="/portal/reservar" className="flex flex-col gap-3 p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                    <CalendarPlus className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <span className="font-semibold block">Reservar turno</span>
                    <span className="text-xs text-muted-foreground block">Agendá una nueva sesión</span>
                  </div>
                </Link>
              </Card>
              
              <Card interactive asChild className="rounded-2xl border-border/50 group">
                <Link href="/portal/turnos" className="flex flex-col gap-3 p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-all group-hover:bg-secondary group-hover:text-secondary-foreground group-hover:scale-110">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <span className="font-semibold block">Mis turnos</span>
                    <span className="text-xs text-muted-foreground block">Ver pendientes e historial</span>
                  </div>
                </Link>
              </Card>

              <Card interactive asChild className="rounded-2xl border-border/50 group">
                <Link href="/portal/perfil" className="flex flex-col gap-3 p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground transition-all group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-110">
                    <User className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <span className="font-semibold block">Mi perfil</span>
                    <span className="text-xs text-muted-foreground block">Actualizá tus datos</span>
                  </div>
                </Link>
              </Card>
            </div>
          </section>
        </div>

        {/* Columna Derecha (Información útil & Experiencia) */}
        <div className="flex flex-col gap-6 md:col-span-3 lg:col-span-2">
          {/* Módulo Experiencia APEX */}
          <Card className="rounded-2xl border-none overflow-hidden relative shadow-md group">
            <div className="absolute inset-0 z-0">
               <Image
                  src="/images/apex-recovery-session.jpeg"
                  alt="Experiencia APEX"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            </div>
            <CardContent className="relative z-10 p-6 pt-32 flex flex-col justify-end h-full">
               <div className="flex items-center gap-2 mb-2 text-secondary">
                 <Activity className="h-4 w-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Recuperación</span>
               </div>
               <h3 className="text-white font-bold text-lg leading-tight mb-2">Potenciá tu rendimiento</h3>
               <p className="text-white/80 text-sm">Consultá con los profesionales por nuestros servicios de Recovery Room.</p>
            </CardContent>
          </Card>

          {/* Información útil */}
          <Card className="rounded-2xl bg-muted/30 border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Información útil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Llegá 10 minutos antes</strong> de tu turno para realizar el ingreso sin apuros.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Traé ropa cómoda y tu botella de agua</strong> para aprovechar al máximo tu entrenamiento.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Avisá con anticipación</strong> desde la sección "Mis turnos" si necesitás cancelar.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. Actividad: próximos y recientes */}
      {(upcomingSorted.length > 0 || recentDone.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/30 pb-4 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-5 w-5 text-primary" />
                Próximos turnos
              </CardTitle>
              {upcomingSorted.length > 0 && (
                <Button variant="ghost" size="sm" asChild className="rounded-full">
                  <Link href="/portal/turnos">Ver todos</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {upcomingSorted.length === 0 ? (
                <div className="p-6">
                   <p className="text-sm text-muted-foreground">
                     No tenés turnos próximos.
                   </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {upcomingSorted.slice(0, 4).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-sm font-semibold capitalize">
                        {formatDateKeyShort(b.date)}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                        {b.startTime}–{b.endTime} hs
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50">
            <CardHeader className="border-b border-border/30 pb-4 bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-primary" />
                Últimos realizados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentDone.length === 0 ? (
                <div className="p-6">
                   <p className="text-sm text-muted-foreground">
                     Todavía no tenés turnos realizados.
                   </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {recentDone.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-sm font-semibold capitalize">
                        {formatDateKeyShort(b.date)}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                        {b.startTime}–{b.endTime} hs
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
