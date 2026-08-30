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
  Activity,
  MapPin
} from "lucide-react";

import { LocationMapCard } from "@/components/features/location-map-card";
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
    <div className="space-y-6 md:space-y-8 stagger-children pb-10">
      {/* 1. Bloque principal de bienvenida */}
      <section className="rounded-[2rem] bg-primary dark:bg-card text-primary-foreground dark:text-card-foreground shadow-lg overflow-hidden flex flex-col border border-transparent dark:border-border">
        {/* Banner superior */}
        <div className="relative px-6 py-10 sm:px-12 sm:py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/apex-training-floor.jpeg"
              alt="Fondo APEX"
              fill
              className="object-cover opacity-15 mix-blend-overlay"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary dark:from-card to-primary/80 dark:to-card/80"></div>
          </div>
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white dark:text-foreground">¡Hola, {firstName}! 👋</h1>
            <p className="max-w-xl text-primary-foreground/80 dark:text-muted-foreground text-lg">
              Bienvenido a tu portal. Gestioná tus sesiones de entrenamiento y recuperación desde acá.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="relative z-10 rounded-full shadow-md w-full sm:w-auto h-12 px-8 font-semibold">
            <Link href="/portal/reservar">
              <CalendarPlus className="mr-2 h-5 w-5" />
              Reservar turno
            </Link>
          </Button>
        </div>
        
        {/* Métricas integradas */}
        <div className="relative z-10 bg-black/10 dark:bg-muted/10 backdrop-blur-md border-t border-white/10 dark:border-border/40 p-4 sm:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/20 dark:divide-border/40">
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:pr-6">
              <div className="rounded-full bg-white/10 dark:bg-primary/10 p-3">
                <CalendarCheck className="h-5 w-5 text-white dark:text-primary"/>
              </div>
              <div>
                 <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">Próximo turno</p>
                 <p className="text-xl font-bold text-white dark:text-foreground">{next ? formatDateKeyShort(next.date) : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:px-6">
              <div className="rounded-full bg-white/10 dark:bg-primary/10 p-3">
                <CalendarDays className="h-5 w-5 text-white dark:text-primary"/>
              </div>
              <div>
                 <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">Turnos pendientes</p>
                 <p className="text-xl font-bold text-white dark:text-foreground">{pendientes}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:pl-6">
              <div className="rounded-full bg-white/10 dark:bg-primary/10 p-3">
                <History className="h-5 w-5 text-white dark:text-primary"/>
              </div>
              <div>
                 <p className="text-white/70 dark:text-muted-foreground text-sm font-medium">Turnos realizados</p>
                 <p className="text-xl font-bold text-white dark:text-foreground">{realizados}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Zona principal: próximo turno y ubicación */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximo turno */}
        <Card className="rounded-[2rem] border-border/40 dark:border-border shadow-sm overflow-hidden flex flex-col h-full bg-card/50 dark:bg-card backdrop-blur-sm">
          <CardHeader className="bg-muted/30 dark:bg-muted/10 border-b border-border/30 pb-4 px-6 sm:px-8 pt-6">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Tu próximo turno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
            {next ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-primary/10 dark:border-white/10 bg-primary/5 dark:bg-white/5 p-6 shadow-inner">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold capitalize text-2xl text-primary">
                      {formatDateKey(next.date)}
                    </span>
                    <StatusBadge status={next.status as BookingStatus} />
                  </div>
                  <p className="flex items-center gap-1.5 tabular-nums text-muted-foreground font-medium text-lg">
                    <Clock className="h-5 w-5" />
                    {next.startTime} – {next.endTime} hs
                  </p>
                </div>
                <Button variant="default" className="rounded-full shadow-sm w-full sm:w-auto font-medium" asChild>
                  <Link href="/portal/turnos">Ver detalle</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
                 <div className="h-16 w-16 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center">
                   <CalendarX className="h-8 w-8 text-primary" />
                 </div>
                 <div className="space-y-1">
                   <h3 className="font-bold text-lg">Sin turnos próximos</h3>
                   <p className="text-muted-foreground max-w-xs mx-auto">No tenés ninguna sesión programada. Empezá reservando tu primer turno.</p>
                 </div>
                 <Button asChild size="default" className="rounded-full shadow-sm mt-2 font-medium">
                   <Link href="/portal/reservar">
                     <CalendarPlus className="mr-2 h-4 w-4" />
                     Ver horarios disponibles
                   </Link>
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ubicación del consultorio */}
        <LocationMapCard />
      </div>

      {/* 3. Acciones rápidas */}
      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight px-2">Acciones rápidas</h2>
        <Card className="rounded-[2rem] border-border/40 dark:border-border shadow-sm overflow-hidden bg-card/50 dark:bg-card backdrop-blur-sm">
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40 dark:divide-border/20">
            <Link href="/portal/reservar" className="flex flex-col gap-4 p-6 sm:p-8 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:bg-muted/50 group">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shadow-sm">
                <CalendarPlus className="h-7 w-7" />
              </span>
              <div>
                <span className="font-bold text-lg block">Reservar turno</span>
                <span className="text-sm text-muted-foreground block mt-1">Agendá una nueva sesión</span>
              </div>
            </Link>
            <Link href="/portal/turnos" className="flex flex-col gap-4 p-6 sm:p-8 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:bg-muted/50 group">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary group-hover:scale-105 transition-transform shadow-sm">
                <CalendarDays className="h-7 w-7" />
              </span>
              <div>
                <span className="font-bold text-lg block">Mis turnos</span>
                <span className="text-sm text-muted-foreground block mt-1">Ver pendientes e historial</span>
              </div>
            </Link>
            <Link href="/portal/perfil" className="flex flex-col gap-4 p-6 sm:p-8 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:bg-muted/50 group">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground group-hover:scale-105 transition-transform shadow-sm">
                <User className="h-7 w-7" />
              </span>
              <div>
                <span className="font-bold text-lg block">Mi perfil</span>
                <span className="text-sm text-muted-foreground block mt-1">Actualizá tus datos personales</span>
              </div>
            </Link>
          </div>
        </Card>
      </section>

      {/* 4. Actividad: próximos y recientes */}
      {(upcomingSorted.length > 0 || recentDone.length > 0) && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight px-2">Actividad</h2>
          <Card className="rounded-[2rem] border-border/40 dark:border-border shadow-sm overflow-hidden bg-card/50 dark:bg-card backdrop-blur-sm">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40 dark:divide-border/20">
              {/* Próximos turnos */}
              <div className="flex flex-col h-full">
                <div className="flex-row items-center justify-between flex border-b border-border/40 dark:border-border/20 p-5 sm:px-6 bg-muted/20 dark:bg-muted/10">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Próximos turnos
                  </div>
                  {upcomingSorted.length > 0 && (
                    <Button variant="ghost" size="sm" asChild className="rounded-full h-8 px-4 text-xs font-semibold">
                      <Link href="/portal/turnos">Ver todos</Link>
                    </Button>
                  )}
                </div>
                <div className="flex-1 p-0">
                  {upcomingSorted.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center py-10">
                      No tenés turnos próximos.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/20 dark:divide-border/10">
                      {upcomingSorted.slice(0, 4).map((b) => (
                        <li key={b.id} className="flex items-center justify-between p-5 sm:px-6 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                          <span className="text-sm font-semibold capitalize">{formatDateKeyShort(b.date)}</span>
                          <span className="text-sm tabular-nums text-muted-foreground font-medium bg-muted/50 dark:bg-muted/20 px-3 py-1.5 rounded-lg border border-border/30 dark:border-border/20">
                            {b.startTime}–{b.endTime} hs
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
              {/* Últimos realizados */}
              <div className="flex flex-col h-full">
                <div className="flex border-b border-border/40 dark:border-border/20 p-5 sm:px-6 bg-muted/20 dark:bg-muted/10 font-bold text-base items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Últimos realizados
                </div>
                <div className="flex-1 p-0">
                  {recentDone.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center py-10">
                      Todavía no tenés turnos realizados.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/20 dark:divide-border/10">
                      {recentDone.map((b) => (
                        <li key={b.id} className="flex items-center justify-between p-5 sm:px-6 hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors">
                          <span className="text-sm font-semibold capitalize">{formatDateKeyShort(b.date)}</span>
                          <span className="text-sm tabular-nums text-muted-foreground font-medium bg-muted/50 dark:bg-muted/20 px-3 py-1.5 rounded-lg border border-border/30 dark:border-border/20">
                            {b.startTime}–{b.endTime} hs
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Información complementaria */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card className="rounded-[2rem] bg-muted/30 dark:bg-muted/10 border-border/40 dark:border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Información útil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-white/10 text-xs font-bold text-primary">✓</span>
                <span><strong className="text-foreground">Llegá 10 minutos antes</strong> de tu turno para realizar el ingreso sin apuros.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-white/10 text-xs font-bold text-primary">✓</span>
                <span><strong className="text-foreground">Traé ropa cómoda y tu botella de agua</strong> para aprovechar al máximo tu entrenamiento.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-white/10 text-xs font-bold text-primary">✓</span>
                <span><strong className="text-foreground">Avisá con anticipación</strong> desde la sección "Mis turnos" si necesitás cancelar.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="rounded-[2rem] border-none overflow-hidden relative shadow-sm group min-h-[15rem]">
          <div className="absolute inset-0 z-0">
             <Image
                src="/images/apex-recovery-session.jpeg"
                alt="Experiencia APEX"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
             {/* Oscurecido base + degradé inferior fuerte: el texto SIEMPRE legible,
                 sin importar qué zona de la foto quede detrás. */}
             <div className="absolute inset-0 bg-black/30"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent"></div>
          </div>
          <CardContent className="relative z-10 p-6 pt-28 flex flex-col justify-end h-full">
             <div className="flex items-center gap-2 mb-3 text-cyan-300 drop-shadow-md">
               <Activity className="h-4 w-4" />
               <span className="text-xs font-bold uppercase tracking-widest">Recovery Room</span>
             </div>
             <h3 className="text-white font-bold text-xl leading-tight mb-2 drop-shadow-md">Potenciá tu rendimiento</h3>
             <p className="text-white/90 text-sm leading-relaxed drop-shadow-md">Consultá con los profesionales por nuestros servicios especializados de recuperación.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
