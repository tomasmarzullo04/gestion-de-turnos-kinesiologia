"use client";

import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STUDIO_LOCATION,
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
} from "@/lib/studio";

export function LocationMapCard() {
  const mapsUrl = googleMapsSearchUrl();

  return (
    <Card className="rounded-[2rem] border-border/40 shadow-sm overflow-hidden flex flex-col h-full bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 border-b border-border/30 pb-4 px-6 sm:px-8 pt-6">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <MapPin className="h-5 w-5 text-primary" />
          Ubicación del consultorio
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir la ubicación del consultorio en Google Maps"
          className="relative h-48 sm:h-56 w-full shrink-0 overflow-hidden block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-b border-border/30"
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

        <div className="flex flex-col flex-1 p-6 sm:p-8 gap-5 justify-between">
          <div className="space-y-1">
            <p className="font-bold text-xl">{STUDIO_LOCATION.name}</p>
            <p className="text-muted-foreground">{STUDIO_LOCATION.address}</p>
          </div>

          <Button asChild className="w-full rounded-full shadow-sm font-medium" variant="secondary">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Cómo llegar
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
