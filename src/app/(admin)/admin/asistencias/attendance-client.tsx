"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { markAttendanceAction } from "@/app/(admin)/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatus,
} from "@/lib/booking-config";
import { parseLocalDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { type AttendanceSlot } from "@/server/services/attendance.service";

interface Props {
  selectedDate: string;
  todayKey: string;
  slots: AttendanceSlot[];
}

const OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: ATTENDANCE_STATUS.PENDING, label: ATTENDANCE_STATUS_LABELS.PENDING },
  { value: ATTENDANCE_STATUS.PRESENT, label: ATTENDANCE_STATUS_LABELS.PRESENT },
  { value: ATTENDANCE_STATUS.ABSENT, label: ATTENDANCE_STATUS_LABELS.ABSENT },
];

function activeClass(value: AttendanceStatus): string {
  if (value === ATTENDANCE_STATUS.PRESENT)
    return "bg-success text-success-foreground";
  if (value === ATTENDANCE_STATUS.ABSENT)
    return "bg-destructive text-destructive-foreground";
  return "bg-background text-foreground shadow-sm";
}

function AttendanceControl({
  value,
  disabled,
  onChange,
}: {
  value: AttendanceStatus;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Asistencia"
      className="inline-flex shrink-0 rounded-lg border bg-muted/50 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-60",
              active
                ? activeClass(opt.value)
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function AttendanceClient({ selectedDate, todayKey, slots }: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<AttendanceSlot[]>(slots);
  const [query, setQuery] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const day = parseLocalDateKey(selectedDate);

  function go(date: string) {
    router.push(`/admin/asistencias?date=${date}`);
  }

  function mark(bookingId: string, status: AttendanceStatus) {
    // Optimistic: actualizamos al instante.
    setItems((prev) =>
      prev.map((slot) => ({
        ...slot,
        attendees: slot.attendees.map((a) =>
          a.bookingId === bookingId ? { ...a, status } : a,
        ),
      })),
    );
    startTransition(async () => {
      const result = await markAttendanceAction({ bookingId, status });
      if (result.success) {
        toast.success(`Marcado: ${ATTENDANCE_STATUS_LABELS[status]}`);
      } else {
        toast.error(result.error);
        // Revertimos a la verdad del servidor.
        router.refresh();
      }
    });
  }

  const normalizedQuery = query.trim().toLowerCase();

  const totalExpected = items.reduce((acc, slot) => acc + slot.attendees.length, 0);
  const totalPresent = items.reduce((acc, slot) => acc + slot.attendees.filter(a => a.status === ATTENDANCE_STATUS.PRESENT).length, 0);
  const totalAbsent = items.reduce((acc, slot) => acc + slot.attendees.filter(a => a.status === ATTENDANCE_STATUS.ABSENT).length, 0);
  const totalPending = items.reduce((acc, slot) => acc + slot.attendees.filter(a => a.status === ATTENDANCE_STATUS.PENDING).length, 0);
  const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Navegador de día + filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Día anterior"
            onClick={() => go(format(addDays(day, -1), "yyyy-MM-dd"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && go(e.target.value)}
            className="w-auto"
            aria-label="Fecha"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Día siguiente"
            onClick={() => go(format(addDays(day, 1), "yyyy-MM-dd"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {selectedDate !== todayKey && (
            <Button variant="ghost" size="sm" onClick={() => go(todayKey)}>
              Hoy
            </Button>
          )}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar socio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar por nombre"
          />
        </div>
      </div>

      <p className="text-sm font-medium capitalize text-muted-foreground">
        {format(day, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
      </p>

      {/* Resumen del día */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Esperados</span>
            <span className="text-lg font-semibold tabular-nums">{totalExpected}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Presentes</span>
            <span className="text-lg font-semibold tabular-nums text-success">{totalPresent}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Ausentes</span>
            <span className="text-lg font-semibold tabular-nums text-destructive">{totalAbsent}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Pendientes</span>
            <span className="text-lg font-semibold tabular-nums text-muted-foreground">{totalPending}</span>
          </div>
          <div className="col-span-2 mt-2 flex flex-col justify-center border-t pt-3 sm:col-span-1 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <span className="text-xs text-muted-foreground">Tasa de Asistencia</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">{attendanceRate}%</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden max-w-[80px]">
                <div 
                  className="h-full bg-success transition-all duration-500 ease-out-soft" 
                  style={{ width: `${attendanceRate}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay turnos este día"
          description="Elegí otra fecha o generá la agenda desde Plantillas."
        />
      ) : (
        <div className="space-y-3">
          {items.map((slot) => {
            const attendees = normalizedQuery
              ? slot.attendees.filter((a) =>
                  a.name.toLowerCase().includes(normalizedQuery),
                )
              : slot.attendees;

            // Con filtro activo, ocultamos franjas sin coincidencias.
            if (normalizedQuery && attendees.length === 0) return null;

            const present = slot.attendees.filter(
              (a) => a.status === ATTENDANCE_STATUS.PRESENT,
            ).length;
            const absent = slot.attendees.filter(
              (a) => a.status === ATTENDANCE_STATUS.ABSENT,
            ).length;

            return (
              <Card key={slot.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {slot.attendees.length} reservados · {present} presentes ·{" "}
                      {absent} ausentes
                    </span>
                  </div>

                  {slot.attendees.length === 0 ? (
                    <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                      Sin reservas en esta franja.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {attendees.map((a) => (
                        <li
                          key={a.bookingId}
                          className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {a.name}
                              </p>
                              {a.serviceName && (
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                  style={{ backgroundColor: a.serviceColor || "#000" }}
                                >
                                  {a.serviceName}
                                </span>
                              )}
                              {a.coverageString === "OBRA_SOCIAL" && (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  {a.coverageName || "Obra Social"}
                                </span>
                              )}
                              {a.requiresCopay && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                  Cobrar Copago
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {a.email}
                                {a.phone ? ` · ${a.phone}` : ""}
                              </span>
                              {a.sessionTotal > 0 && (
                                <span>
                                  · Sesión {a.sessionCurrent}/{a.sessionTotal}
                                </span>
                              )}
                              {a.notes && (
                                <span className="max-w-[200px] truncate rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                  {a.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <AttendanceControl
                            value={a.status}
                            disabled={isPending}
                            onChange={(status) => mark(a.bookingId, status)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Si el filtro no matchea en ninguna franja. */}
          {normalizedQuery &&
            items.every(
              (slot) =>
                slot.attendees.filter((a) =>
                  a.name.toLowerCase().includes(normalizedQuery),
                ).length === 0,
            ) && (
              <EmptyState
                icon={ClipboardList}
                title="Sin resultados"
                description={`Ningún socio coincide con "${query}" en este día.`}
              />
            )}
        </div>
      )}
    </div>
  );
}
