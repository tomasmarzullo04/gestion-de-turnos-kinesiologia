/**
 * Deriva un apellido "de referencia" desde un nombre completo de un solo campo:
 * la última palabra. Es un punto de partida para ordenar; los apellidos
 * compuestos ("De la Torre") se corrigen a mano en la ficha del paciente.
 */
export function deriveApellido(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : name.trim();
}

/** Clave de orden por apellido (apellido explícito o derivado), normalizada. */
export function apellidoSortKey(name: string, apellido?: string | null): string {
  const base = apellido && apellido.trim() ? apellido : deriveApellido(name);
  return base.trim().toLocaleLowerCase("es");
}
