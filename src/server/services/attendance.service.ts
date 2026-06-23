import {
  ATTENDANCE_STATUS,
  type AttendanceStatus,
} from "@/lib/booking-config";
import { prisma } from "@/lib/db";
import { userRepository } from "@/server/repositories/user.repository";

export interface AttendanceAttendee {
  bookingId: string;
  name: string;
  email: string;
  phone: string | null;
  status: AttendanceStatus;
  notes: string | null;
  serviceName: string | null;
  serviceColor: string | null;
  coverageString: string | null;
  coverageName: string | null;
  requiresCopay: boolean;
  sessionTotal: number;
  sessionCurrent: number;
}

export interface AttendanceSlot {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  capacity: number;
  bookedCount: number;
  attendees: AttendanceAttendee[];
}

export const attendanceService = {
  /**
   * Franjas de un día con sus socios reservados (bookings CONFIRMED) y el
   * estado de asistencia. El "quién viene" sale de `bookings`; `attendances`
   * solo aporta el resultado (LEFT JOIN). Sin fila → "PENDING".
   */
  async getDayWithAttendance(dateKey: string): Promise<AttendanceSlot[]> {
    const slots = await prisma.$queryRaw<
      {
        id: string;
        start_time: string;
        end_time: string;
        capacity: number;
        booked_count: number;
      }[]
    >`
      SELECT s.id,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             s.capacity, s.booked_count
      FROM slots s
      WHERE s.date = ${dateKey}::date
      ORDER BY s.start_time
    `;
    if (slots.length === 0) return [];

    const rows = await prisma.$queryRaw<
      {
        booking_id: string;
        slot_id: string;
        user_id: string;
        notes: string | null;
        status: string;
        service_name: string | null;
        service_color: string | null;
      }[]
    >`
      SELECT b.id AS booking_id, b.slot_id, b.user_id, b.notes,
             COALESCE(a.status, 'PENDING') AS status,
             srv.name AS service_name,
             srv.color AS service_color
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN attendances a ON a.booking_id = b.id
      LEFT JOIN services srv ON srv.id = b.service_id
      WHERE s.date = ${dateKey}::date
        AND b.status = 'CONFIRMED'
      ORDER BY b.created_at ASC
    `;

    // Resolver datos del socio (bookings.user_id = User.id, sin FK).
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const users = userIds.length
      ? await userRepository.findManyByIds(userIds)
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // We also need to get the number of attendances for the current session count.
    // For now we'll mock `sessionCurrent` or rely on a count query if needed. 
    // Wait, the instructions say we can just show `user.numeroSesionActual`. 
    // In our updated `User` model, we added these fields:
    // tipo_cobertura, obra_social_nombre, requiere_copago, sesiones_totales, numero_sesion_actual

    return slots.map((s) => ({
      id: s.id,
      startTime: s.start_time,
      endTime: s.end_time,
      capacity: s.capacity,
      bookedCount: s.booked_count,
      attendees: rows
        .filter((r) => r.slot_id === s.id)
        .map((r) => {
          const u = userMap.get(r.user_id);
          // Cast the raw fields from the user. We need to define them.
          const uAny = u as any;
          return {
            bookingId: r.booking_id,
            name: u?.name ?? "Socio",
            email: u?.email ?? "—",
            phone: u?.phone ?? null,
            notes: r.notes,
            status: (r.status as AttendanceStatus) ?? ATTENDANCE_STATUS.PENDING,
            serviceName: r.service_name,
            serviceColor: r.service_color,
            coverageString: uAny?.tipo_cobertura ?? null,
            coverageName: uAny?.obra_social_nombre ?? null,
            requiresCopay: uAny?.requiere_copago ?? false,
            sessionTotal: uAny?.sesiones_totales ?? 0,
            sessionCurrent: uAny?.numero_sesion_actual ?? 0,
          };
        }),
    }));
  },

  /**
   * Marca la asistencia de una reserva (upsert por booking_id). `markedBy` es
   * el `User.id` (text) del profesional que marca.
   */
  async mark(
    bookingId: string,
    status: AttendanceStatus,
    markedBy: string,
  ): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO attendances (booking_id, status, marked_by, marked_at)
      VALUES (${bookingId}::uuid, ${status}::text, ${markedBy}::text, now())
      ON CONFLICT (booking_id) DO UPDATE
        SET status = EXCLUDED.status,
            marked_by = EXCLUDED.marked_by,
            marked_at = now()
    `;
  },
};
