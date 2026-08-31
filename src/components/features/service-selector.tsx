"use client";

import * as React from "react";
import {
  Activity,
  Dumbbell,
  Heart,
  Sparkles,
  Wind,
  Zap,
} from "lucide-react";
import { type ScheduleEntry } from "@/app/(patient)/portal/reservar/service-schedule-hint";
import { cn } from "@/lib/utils";

export interface ServiceOption {
  id: string;
  name: string;
  slug: string;
  color: string;
  capacity: number;
}

interface Props {
  services: ServiceOption[];
  selectedId: string | null;
  onSelect: (service: ServiceOption) => void;
  /**
   * Plantillas activas por servicio (id → franjas). El "cupos/h" del selector
   * sale de acá (la plantilla manda), NO del `capacity` del servicio. Si un
   * servicio no tiene plantilla, se muestra un estado neutro en vez de "0/h".
   */
  schedules?: Record<string, ScheduleEntry[]>;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  rpg: Sparkles,
  recovery: Heart,
  respi: Wind,
  gym: Dumbbell,
  rehab: Activity,
  "gym-ranerzzz": Zap,
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  rpg: "Reeducación Postural Global",
  recovery: "Recuperación y bienestar",
  respi: "Rehabilitación respiratoria",
  gym: "Entrenamiento funcional",
  rehab: "Kinesiología",
  "gym-ranerzzz": "Entrenamiento",
};

export function ServiceSelector({ services, selectedId, onSelect, schedules }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {services.map((service) => {
        const Icon = SERVICE_ICONS[service.slug] ?? Activity;
        const active = selectedId === service.id;
        const description = SERVICE_DESCRIPTIONS[service.slug] ?? service.name;
        // "cupos/h" desde la plantilla (la plantilla manda). Sin plantilla →
        // estado neutro (no "0 cupos/h", que parecería un error/servicio lleno).
        const entries = schedules?.[service.id] ?? [];
        const maxCapacity = entries.length
          ? Math.max(...entries.map((e) => e.capacity))
          : null;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            aria-pressed={active}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ease-out-soft",
              "hover:-translate-y-0.5 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-transparent shadow-e3"
                : "border-border bg-card hover:border-primary/30",
            )}
            style={
              active
                ? {
                    borderColor: service.color,
                    background: `linear-gradient(135deg, ${service.color}12, ${service.color}06)`,
                  }
                : undefined
            }
          >
            {/* Icono con glow */}
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                active ? "text-white" : "text-muted-foreground group-hover:text-foreground",
              )}
              style={
                active
                  ? { backgroundColor: service.color }
                  : { backgroundColor: `${service.color}15` }
              }
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Nombre */}
            <span
              className={cn(
                "text-sm font-semibold tracking-tight transition-colors",
                active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {service.name}
            </span>

            {/* Descripción (se omite si coincide con el nombre para no repetir) */}
            {description !== service.name && (
              <span className="text-[0.65rem] leading-tight text-muted-foreground text-center">
                {description}
              </span>
            )}

            {/* Capacidad (desde la plantilla). Neutra si el servicio aún no
                tiene plantilla cargada. */}
            {maxCapacity === null ? (
              <span className="mt-auto text-[0.65rem] italic text-muted-foreground/70">
                Según disponibilidad
              </span>
            ) : (
              <span
                className={cn(
                  "mt-auto inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors",
                  active ? "text-foreground/80" : "text-muted-foreground",
                )}
                style={
                  active
                    ? { backgroundColor: `${service.color}20` }
                    : { backgroundColor: "hsl(var(--muted))" }
                }
              >
                {maxCapacity} {maxCapacity === 1 ? "cupo" : "cupos"}/h
              </span>
            )}

            {/* Indicador de selección */}
            {active && (
              <div
                className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background"
                style={{ backgroundColor: service.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
