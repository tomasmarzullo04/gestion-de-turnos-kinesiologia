import { BOOKING_CONFIG } from "@/lib/booking-config";
import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { userRepository } from "@/server/repositories/user.repository";

export interface DayAvailability {
  /** "YYYY-MM-DD" */
  date: string;
  availableSlots: number;
  totalSlots: number;
}

export interface SlotView {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  capacity: number;
  bookedCount: number;
  remaining: number;
  isBlocked: boolean;
  isPast: boolean;
  /** Reservable: con cupos, no bloqueada y futura. */
  available: boolean;
  /** Pocos cupos (≤ umbral) y todavía reservable. */
  lowSlots: boolean;
  /** Servicio asociado. */
  serviceId: string | null;
  serviceName: string | null;
  serviceColor: string | null;
  /** true si hay un bloqueo FIRST_TIME activo (primerizos no pueden reservar). */
  firstTimeBlocked: boolean;
}

export interface SlotAttendee {
  bookingId: string;
  userId: string;
  name: string;
  email: string;
  notes: string | null;
}

export interface AdminSlotView extends SlotView {
  attendees: SlotAttendee[];
}

interface RawSlot {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_blocked: boolean;
  is_past: boolean;
  service_id: string | null;
  service_name: string | null;
  service_color: string | null;
  has_total_block: boolean;
  has_first_time_block: boolean;
}

function toSlotView(r: RawSlot): SlotView {
  const remaining = r.capacity - r.booked_count;
  const blocked = r.is_blocked || r.has_total_block;
  const available = !blocked && remaining > 0 && !r.is_past;
  return {
    id: r.id,
    startTime: r.start_time,
    endTime: r.end_time,
    capacity: r.capacity,
    bookedCount: r.booked_count,
    remaining,
    isBlocked: blocked,
    isPast: r.is_past,
    available,
    lowSlots: available && remaining <= BOOKING_CONFIG.lowSlotsThreshold,
    serviceId: r.service_id,
    serviceName: r.service_name,
    serviceColor: r.service_color,
    firstTimeBlocked: r.has_first_time_block,
  };
}

// ── Subconsultas reutilizables para bloqueos de la tabla blocks ────────────
// Estas expresiones se inyectan en los SELECT de las queries de slots.
// Verifican si existe un bloqueo activo (no eliminado) que matchea la franja.
const TOTAL_BLOCK_EXISTS = `
  EXISTS (
    SELECT 1 FROM blocks b
    WHERE b.deleted_at IS NULL
      AND b.block_type = 'TOTAL'
      AND s.date BETWEEN b.date_from AND b.date_to
      AND (b.service_id IS NULL OR b.service_id = s.service_id)
      AND (b.time_from IS NULL OR s.start_time >= b.time_from)
      AND (b.time_to IS NULL OR s.start_time < b.time_to)
  )
`;

const FIRST_TIME_BLOCK_EXISTS = `
  EXISTS (
    SELECT 1 FROM blocks b
    WHERE b.deleted_at IS NULL
      AND b.block_type = 'FIRST_TIME'
      AND s.date BETWEEN b.date_from AND b.date_to
      AND (b.service_id IS NULL OR b.service_id = s.service_id)
      AND (b.time_from IS NULL OR s.start_time >= b.time_from)
      AND (b.time_to IS NULL OR s.start_time < b.time_to)
  )
`;

export const slotService = {
  /**
   * Próximos días (hasta el horizonte) que tienen franjas futuras.
   * Si se pasa `serviceId`, filtra solo las franjas de ese servicio.
   *
   * Los bloqueos TOTAL de la tabla `blocks` se combinan con `is_blocked`
   * del slot para no contar esas franjas como disponibles.
   */
  async getUpcomingDays(serviceId?: string | null): Promise<DayAvailability[]> {
    const serviceFilter = serviceId
      ? prisma.$queryRaw<
          { date: string; available_slots: bigint; total_slots: bigint }[]
        >`
        SELECT s.date::text AS date,
               count(*) FILTER (
                 WHERE NOT s.is_blocked
                   AND s.booked_count < s.capacity
                   AND NOT EXISTS (
                     SELECT 1 FROM blocks b
                     WHERE b.deleted_at IS NULL
                       AND b.block_type = 'TOTAL'
                       AND s.date BETWEEN b.date_from AND b.date_to
                       AND (b.service_id IS NULL OR b.service_id = s.service_id)
                       AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                       AND (b.time_to IS NULL OR s.start_time < b.time_to)
                   )
               ) AS available_slots,
               count(*) AS total_slots
        FROM slots s
        WHERE s.date >= (now() AT TIME ZONE ${TIMEZONE})::date
          AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
          AND s.service_id = ${serviceId}::uuid
        GROUP BY s.date
        ORDER BY s.date
        LIMIT ${BOOKING_CONFIG.generationDays}
      `
      : prisma.$queryRaw<
          { date: string; available_slots: bigint; total_slots: bigint }[]
        >`
        SELECT s.date::text AS date,
               count(*) FILTER (
                 WHERE NOT s.is_blocked
                   AND s.booked_count < s.capacity
                   AND NOT EXISTS (
                     SELECT 1 FROM blocks b
                     WHERE b.deleted_at IS NULL
                       AND b.block_type = 'TOTAL'
                       AND s.date BETWEEN b.date_from AND b.date_to
                       AND (b.service_id IS NULL OR b.service_id = s.service_id)
                       AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                       AND (b.time_to IS NULL OR s.start_time < b.time_to)
                   )
               ) AS available_slots,
               count(*) AS total_slots
        FROM slots s
        WHERE s.date >= (now() AT TIME ZONE ${TIMEZONE})::date
          AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
        GROUP BY s.date
        ORDER BY s.date
        LIMIT ${BOOKING_CONFIG.generationDays}
      `;

    const rows = await serviceFilter;
    return rows.map((r) => ({
      date: r.date,
      availableSlots: Number(r.available_slots),
      totalSlots: Number(r.total_slots),
    }));
  },

  /**
   * Franjas de un día (clave "YYYY-MM-DD") con cupos restantes y estado.
   * Si se pasa `serviceId`, filtra solo las franjas de ese servicio.
   *
   * Cada franja incluye `has_total_block` y `has_first_time_block` de la
   * tabla `blocks`, combinados con `is_blocked` del slot en `toSlotView`.
   */
  async getSlotsForDate(dateKey: string, serviceId?: string | null): Promise<SlotView[]> {
    const rows = serviceId
      ? await prisma.$queryRaw<RawSlot[]>`
          SELECT s.id,
                 to_char(s.start_time, 'HH24:MI') AS start_time,
                 to_char(s.end_time, 'HH24:MI') AS end_time,
                 s.capacity, s.booked_count, s.is_blocked,
                 (((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) <= now()) AS is_past,
                 s.service_id,
                 sv.name AS service_name,
                 sv.color AS service_color,
                 EXISTS (
                   SELECT 1 FROM blocks b
                   WHERE b.deleted_at IS NULL
                     AND b.block_type = 'TOTAL'
                     AND s.date BETWEEN b.date_from AND b.date_to
                     AND (b.service_id IS NULL OR b.service_id = s.service_id)
                     AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                     AND (b.time_to IS NULL OR s.start_time < b.time_to)
                 ) AS has_total_block,
                 EXISTS (
                   SELECT 1 FROM blocks b
                   WHERE b.deleted_at IS NULL
                     AND b.block_type = 'FIRST_TIME'
                     AND s.date BETWEEN b.date_from AND b.date_to
                     AND (b.service_id IS NULL OR b.service_id = s.service_id)
                     AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                     AND (b.time_to IS NULL OR s.start_time < b.time_to)
                 ) AS has_first_time_block
          FROM slots s
          LEFT JOIN services sv ON sv.id = s.service_id
          WHERE s.date = ${dateKey}::date
            AND s.service_id = ${serviceId}::uuid
          ORDER BY s.start_time
        `
      : await prisma.$queryRaw<RawSlot[]>`
          SELECT s.id,
                 to_char(s.start_time, 'HH24:MI') AS start_time,
                 to_char(s.end_time, 'HH24:MI') AS end_time,
                 s.capacity, s.booked_count, s.is_blocked,
                 (((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) <= now()) AS is_past,
                 s.service_id,
                 sv.name AS service_name,
                 sv.color AS service_color,
                 EXISTS (
                   SELECT 1 FROM blocks b
                   WHERE b.deleted_at IS NULL
                     AND b.block_type = 'TOTAL'
                     AND s.date BETWEEN b.date_from AND b.date_to
                     AND (b.service_id IS NULL OR b.service_id = s.service_id)
                     AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                     AND (b.time_to IS NULL OR s.start_time < b.time_to)
                 ) AS has_total_block,
                 EXISTS (
                   SELECT 1 FROM blocks b
                   WHERE b.deleted_at IS NULL
                     AND b.block_type = 'FIRST_TIME'
                     AND s.date BETWEEN b.date_from AND b.date_to
                     AND (b.service_id IS NULL OR b.service_id = s.service_id)
                     AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                     AND (b.time_to IS NULL OR s.start_time < b.time_to)
                 ) AS has_first_time_block
          FROM slots s
          LEFT JOIN services sv ON sv.id = s.service_id
          WHERE s.date = ${dateKey}::date
          ORDER BY s.start_time
        `;
    return rows.map(toSlotView);
  },

  async setBlocked(slotId: string, blocked: boolean): Promise<void> {
    await prisma.slot.update({
      where: { id: slotId },
      data: { isBlocked: blocked },
    });
  },

  /** Vista de admin de un día: franjas + inscriptos (con datos del paciente). */
  async getAdminDay(dateKey: string): Promise<AdminSlotView[]> {
    const slots = await prisma.$queryRaw<RawSlot[]>`
      SELECT s.id,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             s.capacity, s.booked_count, s.is_blocked,
             (((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) <= now()) AS is_past,
             s.service_id,
             sv.name AS service_name,
             sv.color AS service_color,
             EXISTS (
               SELECT 1 FROM blocks b
               WHERE b.deleted_at IS NULL
                 AND b.block_type = 'TOTAL'
                 AND s.date BETWEEN b.date_from AND b.date_to
                 AND (b.service_id IS NULL OR b.service_id = s.service_id)
                 AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                 AND (b.time_to IS NULL OR s.start_time < b.time_to)
             ) AS has_total_block,
             EXISTS (
               SELECT 1 FROM blocks b
               WHERE b.deleted_at IS NULL
                 AND b.block_type = 'FIRST_TIME'
                 AND s.date BETWEEN b.date_from AND b.date_to
                 AND (b.service_id IS NULL OR b.service_id = s.service_id)
                 AND (b.time_from IS NULL OR s.start_time >= b.time_from)
                 AND (b.time_to IS NULL OR s.start_time < b.time_to)
             ) AS has_first_time_block
      FROM slots s
      LEFT JOIN services sv ON sv.id = s.service_id
      WHERE s.date = ${dateKey}::date
      ORDER BY s.start_time
    `;
    if (slots.length === 0) return [];

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        slot: { date: new Date(`${dateKey}T00:00:00.000Z`) },
      },
      select: { id: true, slotId: true, userId: true, notes: true },
    });

    // Resolver nombres de pacientes (bookings.user_id = User.id, sin FK).
    const userIds = [...new Set(bookings.map((b) => b.userId))];
    const users = userIds.length
      ? await userRepository.findManyByIds(userIds)
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return slots.map((s) => {
      const view = toSlotView(s);
      const attendees: SlotAttendee[] = bookings
        .filter((b) => b.slotId === s.id)
        .map((b) => {
          const u = userMap.get(b.userId);
          return {
            bookingId: b.id,
            userId: b.userId,
            name: u?.name ?? "Paciente",
            email: u?.email ?? "—",
            notes: b.notes,
          };
        });
      return { ...view, attendees };
    });
  },
};
