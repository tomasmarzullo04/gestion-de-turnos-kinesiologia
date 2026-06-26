import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/db";

export interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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
  /** Pacientes registrados + cantidad de turnos (próximos / totales) + datos de cobertura. */
  async listWithStats(): Promise<PatientRow[]> {
    const patients = await prisma.user.findMany({
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

  /** Actualizar datos de cobertura y tratamiento de un paciente. */
  async updatePatientInfo(
    userId: string,
    data: {
      tipoCoberturaString?: string | null;
      obraSocialNombre?: string | null;
      requiereCopago?: boolean;
      sesionesTotales?: number;
      esPrimeraVez?: boolean;
    },
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tipoCoberturaString: data.tipoCoberturaString,
        obraSocialNombre: data.obraSocialNombre ?? null,
        requiereCopago: data.requiereCopago,
        sesionesTotales: data.sesionesTotales,
        esPrimeraVez: data.esPrimeraVez,
      },
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
};
