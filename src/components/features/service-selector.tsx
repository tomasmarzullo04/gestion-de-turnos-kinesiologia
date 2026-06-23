"use client";

import * as React from "react";
import {
  Activity,
  Dumbbell,
  Heart,
  Sparkles,
  Wind,
} from "lucide-react";
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
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  rpg: Sparkles,
  recovery: Heart,
  respi: Wind,
  gym: Dumbbell,
  rehab: Activity,
};

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  rpg: "Reeducación Postural Global",
  recovery: "Recuperación y bienestar",
  respi: "Rehabilitación respiratoria",
  gym: "Entrenamiento funcional",
  rehab: "Rehabilitación deportiva",
};

export function ServiceSelector({ services, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {services.map((service) => {
        const Icon = SERVICE_ICONS[service.slug] ?? Activity;
        const active = selectedId === service.id;
        const description = SERVICE_DESCRIPTIONS[service.slug] ?? service.name;
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

            {/* Descripción */}
            <span className="text-[0.65rem] leading-tight text-muted-foreground text-center">
              {description}
            </span>

            {/* Capacidad */}
            <span
              className={cn(
                "mt-auto inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition-colors",
                active
                  ? "text-foreground/80"
                  : "text-muted-foreground",
              )}
              style={
                active
                  ? { backgroundColor: `${service.color}20` }
                  : { backgroundColor: "hsl(var(--muted))" }
              }
            >
              {service.capacity} {service.capacity === 1 ? "cupo" : "cupos"}/h
            </span>

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
