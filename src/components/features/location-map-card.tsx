"use client";

import * as React from "react";
import { ExternalLink, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STUDIO_LOCATION,
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
} from "@/lib/studio";

export function LocationMapCard() {
  const [loaded, setLoaded] = React.useState(false);
  const mapsUrl = googleMapsSearchUrl();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-primary" />
          Cómo llegar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{STUDIO_LOCATION.address}</p>

        {/* Vista de mapa: el embed es una previsualización; al tocar se abre
            Google Maps (overlay sobre el iframe). */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="sr-only">Cargando mapa…</span>
            </div>
          )}
          <iframe
            title={`Mapa de ${STUDIO_LOCATION.name} — ${STUDIO_LOCATION.address}`}
            src={googleMapsEmbedUrl()}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setLoaded(true)}
            className="h-full w-full"
            style={{ border: 0 }}
          />
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir la ubicación del consultorio en Google Maps"
            className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button asChild variant="outline" className="w-full">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir en Google Maps
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
