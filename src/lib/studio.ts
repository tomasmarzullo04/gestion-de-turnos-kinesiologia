/**
 * Datos del consultorio (única fuente de verdad). Cambiá la ubicación acá y se
 * actualiza en todos lados (mapa de Inicio, links a Google Maps, etc.).
 *
 * IMPORTANTE — cómo se ubica el pin del mapa:
 *  - El mapa (embed y "Cómo llegar") consulta por `mapAddress` (dirección
 *    COMPLETA con ciudad y provincia). Así Google muestra un pin ETIQUETADO con
 *    la dirección ("Dean Funes 1694"), en vez del pin "pelado" con coordenadas
 *    crudas (que confunde porque no muestra ningún nombre).
 *  - `mapAddress` DEBE incluir ciudad y provincia: hay varias calles/ciudades
 *    "Deán Funes" en Argentina (p. ej. Deán Funes, Córdoba); sin la ciudad,
 *    Google geolocaliza a otra provincia. Con la ciudad, queda sin ambigüedad.
 *  - `coords` guarda el punto EXACTO verificado (altura 1694). NO se usa por
 *    defecto porque Google lo renderiza como pin sin etiqueta; queda como
 *    referencia y para volver a un centrado exacto si algún día hace falta.
 *  - `displayAddress` es SOLO para mostrar en la tarjeta (texto corto). El mapa
 *    NO lo usa.
 */
export const STUDIO_LOCATION = {
  name: "Apex",
  /** Texto corto para mostrar en la UI. */
  displayAddress: "Dean Funes 1694, Mar del Plata",
  /** Dirección COMPLETA que usa el mapa (con ciudad y provincia → sin ambigüedad). */
  mapAddress: "Dean Funes 1694, Mar del Plata, Buenos Aires, Argentina",
  /**
   * Punto EXACTO verificado "lat,lng" (altura 1694; Mar del Plata: lat ≈ -38.0,
   * lng ≈ -57.5). Referencia; el mapa usa `mapAddress` para mostrar un pin con
   * etiqueta. Si algún día querés centrar por coordenada exacta, usalo en
   * `mapsQuery()`.
   */
  coords: "-37.992092565135245,-57.56085270369297" as string,
};

/**
 * Texto de consulta para Google Maps. Usa la dirección completa (pin etiquetado
 * y sin ambigüedad por incluir ciudad/provincia), no las coordenadas crudas
 * (que dan un pin sin nombre).
 */
function mapsQuery(): string {
  return STUDIO_LOCATION.mapAddress;
}

/** URL para abrir Google Maps (navegación) en una pestaña nueva. */
export function googleMapsSearchUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery())}`;
}

/** URL del embed de mapa (sin API key, vía output=embed). */
export function googleMapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;
}
