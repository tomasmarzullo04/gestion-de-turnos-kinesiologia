"use client";

import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  STUDIO_LOCATION,
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
} from "@/lib/studio";

/**
 * Tarjeta de ubicación COMPACTA para la parte alta de Inicio: dirección visible
 * + botón "Cómo llegar". En pantallas ≥ sm muestra una mini-vista de mapa. Al
 * tocar (mapa o botón) abre Google Maps con la dirección centralizada en config.
 */
export function LocationMapCard() {
  const mapsUrl = googleMapsSearchUrl();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        {/* Mini-mapa (solo sm+). El embed es previsualización; al tocar abre Maps. */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir la ubicación del consultorio en Google Maps"
          className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg border bg-muted sm:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <iframe
            title={`Mapa de ${STUDIO_LOCATION.name} — ${STUDIO_LOCATION.address}`}
            src={googleMapsEmbedUrl()}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="pointer-events-none h-full w-full"
            style={{ border: 0 }}
          />
        </a>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Consultorio {STUDIO_LOCATION.name}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {STUDIO_LOCATION.address}
          </p>
        </div>

        <Button asChild className="w-full sm:w-auto">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Cómo llegar
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
