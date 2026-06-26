import { TIMEZONE } from "@/lib/constants";
import { toLocalDateKey } from "@/lib/datetime";
import { prisma } from "@/lib/db";

export interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  upcoming: number;
  total: number;
  // ── Copago del mes en curso ─────────────────────────────────────────────
  copagoPaid: number; // copagos pagados este mes (suma de cantidades)
  copagoExpected: number; // turnos del mes (cada uno debe un copago)
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

    // Mes en curso (zona del estudio) para el estado de copagos.
    const todayKey = toLocalDateKey(new Date());
    const [yStr, mStr] = todayKey.split("-");
    const year = Number(yStr);
    const month = Number(mStr);

    // Conteos por paciente (bookings.user_id = User.id, sin FK → agregamos aparte).
    // `expected` = turnos CONFIRMED del mes en curso (cada uno debe un copago).
    const counts = await prisma.$queryRaw<
      { user_id: string; upcoming: bigint; total: bigint; expected: bigint }[]
    >`
      SELECT b.user_id,
             count(*) FILTER (
               WHERE b.status = 'CONFIRMED'
                 AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
             ) AS upcoming,
             count(*) AS total,
             count(*) FILTER (
               WHERE b.status = 'CONFIRMED'
                 AND extract(year FROM s.date) = ${year}
                 AND extract(month FROM s.date) = ${month}
             ) AS expected
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      GROUP BY b.user_id
    `;
    const map = new Map(
      counts.map((c) => [
        c.user_id,
        {
          upcoming: Number(c.upcoming),
          total: Number(c.total),
          expected: Number(c.expected),
        },
      ]),
    );

    // Copagos pagados en el mes por paciente (suma de cantidades, sin anulados).
    // Si la tabla `payments` aún no existe (migración pendiente), degradamos a
    // "0 pagado" sin romper la página de Pacientes.
    let paidMap = new Map<string, number>();
    try {
      const paidRows = await prisma.$queryRaw<{ user_id: string; paid: bigint }[]>`
        SELECT user_id, coalesce(sum(quantity), 0) AS paid
        FROM payments
        WHERE type = 'COPAGO' AND voided_at IS NULL
          AND period_year = ${year} AND period_month = ${month}
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
      copagoPaid: paidMap.get(p.id) ?? 0,
      copagoExpected: map.get(p.id)?.expected ?? 0,
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
