import type { Metadata } from "next";
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
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BookingStatus } from "@/lib/booking-config";
import { requirePatient } from "@/lib/auth/session";
import { formatDate, formatDateShort, parseLocalDateKey } from "@/lib/datetime";
import { bookingService } from "@/server/services/booking.service";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const user = await requirePatient();
  const bookings = await bookingService.listForUser(user.id);

  const now = Date.now();
  // Próximos ordenados de más cercano a más lejano (la query viene DESC).
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
      {/* 1. Tarjeta de bienvenida */}
      <section>
        <PageHeader title={`Hola ${firstName} 👋`} description="Bienvenido nuevamente. Desde aquí podés gestionar todos tus turnos de manera rápida." />
      </section>

      {/* 2. Resumen (Stat Cards) */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Próximo turno"
          value={next ? formatDateShort(parseLocalDateKey(next.date)) : "—"}
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

      <div className="grid gap-6 md:grid-cols-7">
        {/* Columna Izquierda (Próximo Turno + Acciones Rápidas) */}
        <div className="flex flex-col gap-6 md:col-span-4 lg:col-span-5">
          {/* 3. Próximo turno */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Tu próximo turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              {next ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize text-lg">
                        {formatDate(parseLocalDateKey(next.date))}
                      </span>
                      <StatusBadge status={next.status as BookingStatus} />
                    </div>
                    <p className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {next.startTime} – {next.endTime} h
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/portal/turnos">Gestionar</Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="Todavía no tenés ningún turno reservado."
                  description="Empezá reservando tu primer turno de entrenamiento."
                  action={
                    <Button asChild size="lg" className="mt-2">
                      <Link href="/portal/reservar">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Reservar turno
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* 4. Acciones rápidas */}
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Acciones rápidas</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card interactive asChild>
                <Link href="/portal/reservar" className="flex flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarPlus className="h-5 w-5" />
                  </span>
                  <span className="font-medium">Reservar turno</span>
                  <span className="text-xs text-muted-foreground">Agendá una nueva sesión</span>
                </Link>
              </Card>
              
              <Card interactive asChild>
                <Link href="/portal/turnos" className="flex flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <span className="font-medium">Mis turnos</span>
                  <span className="text-xs text-muted-foreground">Ver pendientes e historial</span>
                </Link>
              </Card>

              <Card interactive asChild>
                <Link href="/portal/perfil" className="flex flex-col gap-2 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </span>
                  <span className="font-medium">Mi perfil</span>
                  <span className="text-xs text-muted-foreground">Actualizá tus datos</span>
                </Link>
              </Card>
            </div>
          </section>
        </div>

        {/* Columna Derecha (Información útil) */}
        <div className="md:col-span-3 lg:col-span-2">
          {/* 5. Información útil */}
          <Card className="h-full bg-accent/30 border-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-primary" />
                Información útil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Llegá 10 minutos antes</strong> de tu turno para realizar el ingreso sin apuros.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Traé ropa cómoda y tu botella de agua</strong> para aprovechar al máximo tu entrenamiento.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">•</span>
                  <span><strong>Avisá con anticipación</strong> desde la sección "Mis turnos" si necesitás cancelar, para liberar el cupo.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. Actividad: próximos y recientes */}
      {(upcomingSorted.length > 0 || recentDone.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Próximos turnos
              </CardTitle>
              {upcomingSorted.length > 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/portal/turnos">Ver todos</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {upcomingSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tenés turnos próximos.
                </p>
              ) : (
                <ul className="divide-y">
                  {upcomingSorted.slice(0, 4).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm font-medium capitalize">
                        {formatDateShort(parseLocalDateKey(b.date))}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {b.startTime}–{b.endTime} h
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Últimos realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDone.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés turnos realizados.
                </p>
              ) : (
                <ul className="divide-y">
                  {recentDone.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm font-medium capitalize">
                        {formatDateShort(parseLocalDateKey(b.date))}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {b.startTime}–{b.endTime} h
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
