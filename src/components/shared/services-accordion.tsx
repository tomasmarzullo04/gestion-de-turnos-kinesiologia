"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Dumbbell, Activity, Heart, Wind, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    id: "gym",
    title: "GYM",
    subtitle: "Entrenamiento funcional",
    description: "Sesiones de entrenamiento funcional para mejorar fuerza, movilidad y rendimiento.",
    icon: Dumbbell,
  },
  {
    id: "kinesiologia",
    title: "Kinesiología",
    subtitle: "Rehabilitación y movimiento",
    description: "Atención profesional para acompañar tu recuperación y volver a moverte con seguridad.",
    icon: Activity,
  },
  {
    id: "recovery",
    title: "RECOVERY",
    subtitle: "Recuperación y bienestar",
    description: "Un espacio para recuperar, bajar la fatiga y preparar tu cuerpo para la próxima sesión.",
    icon: Heart,
    image: "/images/apex-recovery-room.jpeg"
  },
  {
    id: "respi",
    title: "RESPI",
    subtitle: "Rehabilitación respiratoria",
    description: "Acompañamiento orientado a mejorar tu capacidad respiratoria y bienestar físico.",
    icon: Wind,
  },
  {
    id: "rpg",
    title: "RPG",
    subtitle: "Reeducación Postural Global",
    description: "Trabajo personalizado para mejorar postura, movilidad y equilibrio corporal.",
    icon: Sparkles,
  }
];

export function ServicesAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="flex flex-col gap-4 md:hidden">
      {services.map((service, index) => {
        const isOpen = openIndex === index;
        return (
          <div 
            key={service.id} 
            className={cn(
              "overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-300",
              isOpen ? "shadow-md border-primary/20" : "shadow-sm"
            )}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between p-6 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-4">
                <span className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground transition-colors",
                  isOpen ? "bg-primary text-primary-foreground" : "group-hover:bg-primary/10"
                )}>
                  <service.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-lg font-bold uppercase tracking-wider">{service.title}</span>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-300",
                isOpen && "rotate-180"
              )} />
            </button>
            
            <div 
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out-soft",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="p-6 pt-0 space-y-4">
                  <div>
                    <p className="font-medium text-foreground text-sm mb-2">{service.subtitle}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  {service.image && (
                    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-border/40 shadow-sm mt-4">
                      <Image 
                        src={service.image} 
                        alt={service.title} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
