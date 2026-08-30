/**
 * Datos del consultorio (única fuente de verdad). Cambiá la ubicación acá y se
 * actualiza en todos lados (mapa de Inicio, links a Google Maps, etc.).
 *
 * IMPORTANTE — cómo se ubica el pin del mapa:
 *  - El mapa (embed y "Cómo llegar") usa `coords` ("lat,lng") con PRIORIDAD. Es
 *    lo más robusto: un punto exacto, sin ambigüedad.
 *  - Si `coords` está vacío, cae a `mapAddress` (dirección COMPLETA con ciudad y
 *    provincia). Nunca uses una dirección sin ciudad: hay varias calles/ciudades
 *    "Deán Funes" en Argentina (p. ej. Deán Funes, Córdoba), y sin la ciudad
 *    Google geolocaliza a otra provincia.
 *  - `displayAddress` es SOLO para mostrar en la tarjeta (texto corto). El mapa
 *    NO lo usa.
 */
export const STUDIO_LOCATION = {
  name: "Apex",
  /** Texto corto para mostrar en la UI. */
  displayAddress: "Dean Funes 1694, Mar del Plata",
  /** Dirección COMPLETA (respaldo del mapa si no hay coords). Con ciudad y prov. */
  mapAddress: "Dean Funes 1694, Mar del Plata, Buenos Aires, Argentina",
  /**
   * Coordenadas EXACTAS "lat,lng" del consultorio (altura 1694). Se priorizan
   * sobre `mapAddress`. Para Mar del Plata, lat ≈ -38.0 y lng ≈ -57.5.
   */
  coords: "-37.992092565135245,-57.56085270369297" as string,
};

/** Texto de consulta para Google Maps (coords si hay, si no la dirección completa). */
function mapsQuery(): string {
  return STUDIO_LOCATION.coords.trim() || STUDIO_LOCATION.mapAddress;
}

/** URL para abrir Google Maps (navegación) en una pestaña nueva. */
export function googleMapsSearchUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery())}`;
}

/** URL del embed de mapa (sin API key, vía output=embed). */
export function googleMapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;
}
