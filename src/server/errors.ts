/**
 * Error de regla de negocio: su mensaje es seguro para mostrar al usuario.
 * Las Server Actions lo capturan y lo devuelven como ActionResult de error.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class NotFoundError extends BusinessError {
  constructor(entity = "El recurso") {
    super(`${entity} no existe o fue eliminado`);
    this.name = "NotFoundError";
  }
}
