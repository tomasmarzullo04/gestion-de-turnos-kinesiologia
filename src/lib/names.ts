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

/**
 * Formato de visualización "Apellido, Nombre". Quita del nombre completo los
 * tokens del apellido (esté al principio o al final), así funciona sin importar
 * cómo se haya cargado el nombre. Si no queda "nombre", muestra solo el apellido.
 */
export function formatApellidoNombre(name: string, apellido?: string | null): string {
  const ape = (apellido && apellido.trim() ? apellido : deriveApellido(name)).trim();
  const apeSet = new Set(ape.toLocaleLowerCase("es").split(/\s+/).filter(Boolean));
  const rest = name
    .trim()
    .split(/\s+/)
    .filter((t) => t && !apeSet.has(t.toLocaleLowerCase("es")))
    .join(" ");
  return rest ? `${ape}, ${rest}` : ape;
}
