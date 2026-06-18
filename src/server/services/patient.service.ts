import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/db";

export interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  upcoming: number;
  total: number;
}

export const patientService = {
  /** Pacientes registrados + cantidad de turnos (próximos / totales). */
  async listWithStats(): Promise<PatientRow[]> {
    const patients = await prisma.user.findMany({
      where: { role: "PATIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    });

    // Conteos por paciente (bookings.user_id = User.id, sin FK → agregamos aparte).
    const counts = await prisma.$queryRaw<
      { user_id: string; upcoming: bigint; total: bigint }[]
    >`
      SELECT b.user_id,
             count(*) FILTER (
               WHERE b.status = 'CONFIRMED'
                 AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
             ) AS upcoming,
             count(*) AS total
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      GROUP BY b.user_id
    `;
    const map = new Map(
      counts.map((c) => [
        c.user_id,
        { upcoming: Number(c.upcoming), total: Number(c.total) },
      ]),
    );

    return patients.map((p) => ({
      ...p,
      upcoming: map.get(p.id)?.upcoming ?? 0,
      total: map.get(p.id)?.total ?? 0,
    }));
  },
};
