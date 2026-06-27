/**
 * Datos del consultorio (única fuente de verdad). Cambiá la dirección acá y se
 * actualiza en todos lados (mapa de Inicio, links a Google Maps, etc.).
 *
 * Para mayor precisión en Google Maps podés completar la dirección con ciudad y
 * país (p. ej. "Dean Dunes 1694, Ciudad, País"). Si tenés las coordenadas
 * exactas, cargalas en `coords` ("lat,lng") y se usan con prioridad.
 */
export const STUDIO_LOCATION = {
  name: "Apex",
  address: "Dean Dunes 1694",
  /** Opcional: "lat,lng". Si está, se prioriza sobre la dirección. */
  coords: "" as string,
};

/** Texto de consulta para Google Maps (coords si hay, si no la dirección). */
function mapsQuery(): string {
  return STUDIO_LOCATION.coords.trim() || STUDIO_LOCATION.address;
}

/** URL para abrir Google Maps (navegación) en una pestaña nueva. */
export function googleMapsSearchUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery())}`;
}

/** URL del embed de mapa (sin API key, vía output=embed). */
export function googleMapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;
}
