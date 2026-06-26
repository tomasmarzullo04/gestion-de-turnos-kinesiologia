import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { BusinessError } from "@/server/errors";

export interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  archived: boolean;
  upcoming: number;
  total: number;
  // ── Copago (balance histórico, no mensual) ──────────────────────────────
  copagoAttended: number; // sesiones con asistencia PRESENT (cada una debe 1 copago)
  copagoPaid: number; // copagos ya pagados (suma de cantidades)
  // ── Campos de cobertura y tratamiento ───────────────────────────────────
  tipoCoberturaString: string | null;
  obraSocialNombre: string | null;
  requiereCopago: boolean;
  sesionesTotales: number;
  numeroSesionActual: number;
  esPrimeraVez: boolean;
  tratamientoInicio: string | null;
  tratamientoFin: string | null;
}

export const patientService = {
  /**
   * Pacientes + turnos (próximos / totales) + copago + datos de cobertura.
   * Por defecto excluye los archivados (baja lógica); `includeArchived` los trae
   * para la vista de "Archivados".
   */
  async listWithStats(includeArchived = false): Promise<PatientRow[]> {
    const allPatients = await prisma.user.findMany({
      where: { role: "PATIENT" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tipoCoberturaString: true,
        obraSocialNombre: true,
        requiereCopago: true,
        sesionesTotales: true,
        numeroSesionActual: true,
        esPrimeraVez: true,
        tratamientoInicio: true,
        tratamientoFin: true,
      },
    });

    // Conjunto de pacientes archivados. Vía SQL crudo + fallback: si la columna
    // `archived_at` aún no existe (migración pendiente), no hay archivados y la
    // lista no se rompe.
    let archivedSet = new Set<string>();
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User" WHERE archived_at IS NOT NULL
      `;
      archivedSet = new Set(rows.map((r) => r.id));
    } catch {
      archivedSet = new Set();
    }

    const patients = allPatients.filter((p) =>
      includeArchived ? archivedSet.has(p.id) : !archivedSet.has(p.id),
    );

    // Conteos por paciente (bookings.user_id = User.id, sin FK → agregamos aparte).
    // `attended` = sesiones con asistencia PRESENT (cada una genera 1 copago).
    const counts = await prisma.$queryRaw<
      { user_id: string; upcoming: bigint; total: bigint; attended: bigint }[]
    >`
      SELECT b.user_id,
             count(*) FILTER (
               WHERE b.status = 'CONFIRMED'
                 AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
             ) AS upcoming,
             count(*) AS total,
             count(*) FILTER (WHERE a.status = 'PRESENT') AS attended
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN attendances a ON a.booking_id = b.id
      GROUP BY b.user_id
    `;
    const map = new Map(
      counts.map((c) => [
        c.user_id,
        {
          upcoming: Number(c.upcoming),
          total: Number(c.total),
          attended: Number(c.attended),
        },
      ]),
    );

    // Copagos pagados por paciente (histórico, suma de cantidades, sin anulados).
    // Si la tabla `payments` aún no existe (migración pendiente), degradamos a
    // "0 pagado" sin romper la página de Pacientes.
    let paidMap = new Map<string, number>();
    try {
      const paidRows = await prisma.$queryRaw<{ user_id: string; paid: bigint }[]>`
        SELECT user_id, coalesce(sum(quantity), 0) AS paid
        FROM payments
        WHERE type = 'COPAGO' AND voided_at IS NULL
        GROUP BY user_id
      `;
      paidMap = new Map(paidRows.map((r) => [r.user_id, Number(r.paid)]));
    } catch {
      paidMap = new Map();
    }

    return patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      archived: archivedSet.has(p.id),
      upcoming: map.get(p.id)?.upcoming ?? 0,
      total: map.get(p.id)?.total ?? 0,
      copagoAttended: map.get(p.id)?.attended ?? 0,
      copagoPaid: paidMap.get(p.id) ?? 0,
      tipoCoberturaString: p.tipoCoberturaString,
      obraSocialNombre: p.obraSocialNombre,
      requiereCopago: p.requiereCopago,
      sesionesTotales: p.sesionesTotales,
      numeroSesionActual: p.numeroSesionActual,
      esPrimeraVez: p.esPrimeraVez,
      tratamientoInicio: p.tratamientoInicio?.toISOString() ?? null,
      tratamientoFin: p.tratamientoFin?.toISOString() ?? null,
    }));
  },

  /** Lista mínima de pacientes (id + nombre), para selects. */
  async listBasic(): Promise<{ id: string; name: string }[]> {
    return prisma.user.findMany({
      where: { role: "PATIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  },

  /**
   * Editar un paciente: datos personales (nombre/email/teléfono) + cobertura.
   * Valida unicidad de email. Registra quién editó (`updated_by`).
   */
  async editPatient(
    userId: string,
    data: {
      name: string;
      email: string;
      phone?: string | null;
      tipoCoberturaString?: string | null;
      obraSocialNombre?: string | null;
      requiereCopago?: boolean;
      sesionesTotales?: number;
      esPrimeraVez?: boolean;
    },
    editorId: string,
  ): Promise<void> {
    // Unicidad de email: no puede chocar con otro usuario.
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new BusinessError("Ya existe un usuario con ese email.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ? data.phone : null,
        tipoCoberturaString: data.tipoCoberturaString,
        obraSocialNombre: data.obraSocialNombre ?? null,
        requiereCopago: data.requiereCopago,
        sesionesTotales: data.sesionesTotales,
        esPrimeraVez: data.esPrimeraVez,
      },
    });

    // Auditoría best-effort: si la columna aún no existe, no rompe la edición.
    try {
      await prisma.$executeRaw`
        UPDATE "User" SET updated_by = ${editorId} WHERE id = ${userId}
      `;
    } catch {
      /* columna updated_by pendiente de migración */
    }
  },

  /** Impacto de eliminar un paciente: historial asociado y turnos futuros. */
  async getDeletionImpact(userId: string): Promise<{
    bookings: number;
    futureBookings: number;
    attendances: number;
    payments: number;
    hasHistory: boolean;
  }> {
    const [bookingRows, attendanceRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint; future: bigint }[]>`
        SELECT count(*) AS total,
               count(*) FILTER (
                 WHERE b.status = 'CONFIRMED'
                   AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
               ) AS future
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        WHERE b.user_id = ${userId}
      `,
      prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n
        FROM attendances a
        JOIN bookings b ON b.id = a.booking_id
        WHERE b.user_id = ${userId}
      `,
    ]);

    // Pagos: tabla opcional (puede no existir aún) → 0 si falta.
    let payments = 0;
    try {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM payments WHERE user_id = ${userId}
      `;
      payments = Number(rows[0]?.n ?? 0);
    } catch {
      payments = 0;
    }

    const bookings = Number(bookingRows[0]?.total ?? 0);
    const futureBookings = Number(bookingRows[0]?.future ?? 0);
    const attendances = Number(attendanceRows[0]?.n ?? 0);

    return {
      bookings,
      futureBookings,
      attendances,
      payments,
      hasHistory: bookings > 0 || attendances > 0 || payments > 0,
    };
  },

  /**
   * Elimina un paciente respetando su historial:
   *  - Con historial (turnos / asistencias / pagos): BAJA LÓGICA (archivado),
   *    cancelando antes sus turnos futuros para liberar cupo. No se borra nada
   *    de su historial ni sus pagos (datos contables).
   *  - Sin ningún dato asociado: borrado físico real.
   * Devuelve el modo aplicado y cuántos turnos futuros se cancelaron.
   */
  async deletePatient(
    userId: string,
    adminId: string,
  ): Promise<{ mode: "archived" | "deleted"; cancelledFuture: number }> {
    const impact = await this.getDeletionImpact(userId);

    if (!impact.hasHistory) {
      await prisma.user.delete({ where: { id: userId } });
      return { mode: "deleted", cancelledFuture: 0 };
    }

    // Archivar primero (cambio de estado crítico). Si la columna aún no existe
    // (migración pendiente), esto falla acá sin haber cancelado nada.
    await prisma.user.update({
      where: { id: userId },
      data: { archivedAt: new Date(), archivedBy: adminId },
    });

    // Cancelar turnos futuros (libera cupo de forma atómica).
    const future = await prisma.$queryRaw<{ id: string }[]>`
      SELECT b.id
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.user_id = ${userId}
        AND b.status = 'CONFIRMED'
        AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
    `;
    for (const row of future) {
      await prisma.$executeRaw`
        SELECT cancel_booking(${row.id}::uuid, ${userId}::text)
      `;
    }

    return { mode: "archived", cancelledFuture: future.length };
  },

  /** Reactivar (desarchivar) un paciente. */
  async reactivatePatient(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { archivedAt: null, archivedBy: null },
    });
  },

  /** Obtener datos de primera vez / cobertura de un usuario (para el booking flow). */
  async getPatientProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        esPrimeraVez: true,
        tipoCoberturaString: true,
        obraSocialNombre: true,
        requiereCopago: true,
        sesionesTotales: true,
        numeroSesionActual: true,
        tratamientoInicio: true,
        tratamientoFin: true,
      },
    });
  },

  /**
   * ¿El paciente está archivado (baja lógica)? Resiliente a que la columna aún
   * no exista (migración pendiente) → `false`.
   */
  async isArchived(userId: string): Promise<boolean> {
    try {
      const rows = await prisma.$queryRaw<{ archived: boolean }[]>`
        SELECT (archived_at IS NOT NULL) AS archived FROM "User" WHERE id = ${userId}
      `;
      return rows[0]?.archived ?? false;
    } catch {
      return false;
    }
  },
};
