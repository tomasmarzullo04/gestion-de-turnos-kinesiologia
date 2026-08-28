import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";
import { parseLocalDateKey, toLocalDateKey } from "@/lib/datetime";

export interface DailyKPIs {
  totalCapacity: number;
  totalBooked: number;
  occupancyRate: number; // 0-100
  expected: number;
  present: number;
  absent: number;
  pending: number;
  attendanceRate: number; // 0-100
}

export interface SlotOccupancy {
  time: string;
  capacity: number;
  booked: number;
  free: number;
  occupancyRate: number; // 0-100
}

export interface AttendanceTrendDay {
  date: string;
  expected: number;
  present: number;
  absent: number;
  attendanceRate: number;
}

export interface PeakHour {
  time: string;
  avgOccupancy: number; // 0-100
}

export const analyticsService = {
  /**
   * KPIs principales de un día específico.
   */
  async getDailyKPIs(dateKey: string): Promise<DailyKPIs> {
    const slotsRes = await prisma.$queryRaw<
      { total_capacity: bigint; total_booked: bigint }[]
    >`
      SELECT 
        COALESCE(SUM(capacity), 0) as total_capacity,
        COALESCE(SUM(booked_count), 0) as total_booked
      FROM slots
      WHERE date = ${dateKey}::date
    `;

    const attendanceRes = await prisma.$queryRaw<
      {
        expected: bigint;
        present: bigint;
        absent: bigint;
        pending: bigint;
      }[]
    >`
      SELECT 
        COUNT(b.id) as expected,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status IS NULL OR a.status = 'PENDING' THEN 1 ELSE 0 END) as pending
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN attendances a ON a.booking_id = b.id
      WHERE s.date = ${dateKey}::date
        AND b.status = 'CONFIRMED'
    `;

    const cap = Number(slotsRes[0]?.total_capacity ?? 0);
    const booked = Number(slotsRes[0]?.total_booked ?? 0);
    const occupancyRate = cap > 0 ? (booked / cap) * 100 : 0;

    const att = attendanceRes[0];
    const expected = Number(att?.expected ?? 0);
    const present = Number(att?.present ?? 0);
    const absent = Number(att?.absent ?? 0);
    const pending = Number(att?.pending ?? 0);
    const attendanceRate = expected > 0 ? (present / expected) * 100 : 0;

    return {
      totalCapacity: cap,
      totalBooked: booked,
      occupancyRate,
      expected,
      present,
      absent,
      pending,
      attendanceRate,
    };
  },

  /**
   * Ocupación por franja horaria para el gráfico de barras.
   */
  async getOccupancyBySlot(dateKey: string): Promise<SlotOccupancy[]> {
    // Reservas REALES por franja horaria del día, agregadas en la base. Se suma
    // por horario (varios servicios comparten una franja) → una barra por hora.
    // La suma de `booked` = SUM(booked_count) del día = KPI "Turnos Reservados".
    const res = await prisma.$queryRaw<
      { time: string; capacity: bigint; booked: bigint }[]
    >`
      SELECT
        to_char(start_time, 'HH24:MI') as time,
        COALESCE(SUM(capacity), 0)     as capacity,
        COALESCE(SUM(booked_count), 0) as booked
      FROM slots
      WHERE date = ${dateKey}::date
      GROUP BY start_time
      ORDER BY start_time
    `;

    return res.map((r) => {
      const capacity = Number(r.capacity);
      const booked = Number(r.booked);
      return {
        time: r.time,
        capacity,
        booked,
        free: capacity - booked,
        occupancyRate: capacity > 0 ? (booked / capacity) * 100 : 0,
      };
    });
  },

  /**
   * Tendencia de asistencia y ausentismo de los últimos N días.
   * Se evalúa hasta `endDateKey` inclusive (suele ser "hoy").
   */
  async getAttendanceTrend(endDateKey: string, days: number = 7): Promise<AttendanceTrendDay[]> {
    const startDateKey = toLocalDateKey(subDays(new Date(endDateKey), days - 1));

    const res = await prisma.$queryRaw<
      {
        date: string;
        expected: bigint;
        present: bigint;
        absent: bigint;
      }[]
    >`
      SELECT 
        to_char(s.date, 'YYYY-MM-DD') as date,
        COUNT(b.id) as expected,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent
      FROM slots s
      LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
      LEFT JOIN attendances a ON a.booking_id = b.id
      WHERE s.date >= ${startDateKey}::date
        AND s.date <= ${endDateKey}::date
      GROUP BY s.date
      ORDER BY s.date
    `;

    return res.map((r) => {
      const expected = Number(r.expected);
      const present = Number(r.present);
      return {
        date: r.date,
        expected,
        present,
        absent: Number(r.absent),
        attendanceRate: expected > 0 ? (present / expected) * 100 : 0,
      };
    });
  },

  /**
   * Franjas más demandadas del último mes (horarios pico).
   */
  async getPeakHours(endDateKey: string, days: number = 30): Promise<PeakHour[]> {
    const startDateKey = toLocalDateKey(subDays(new Date(endDateKey), days));

    const res = await prisma.$queryRaw<{ time: string; avg_occupancy: number }[]>`
      SELECT 
        to_char(start_time, 'HH24:MI') as time,
        AVG(booked_count::float / NULLIF(capacity, 0)) * 100 as avg_occupancy
      FROM slots
      WHERE date >= ${startDateKey}::date
        AND date <= ${endDateKey}::date
        AND capacity > 0
      GROUP BY start_time
      ORDER BY avg_occupancy DESC
      LIMIT 3
    `;

    return res.map((r) => ({
      time: r.time,
      avgOccupancy: r.avg_occupancy,
    }));
  },

  /**
   * Comparativa simple de la semana actual contra la anterior.
   * "Semana actual" = últimos 7 días terminando en `endDateKey`.
   * "Semana anterior" = 7 días previos a "Semana actual".
   */
  /**
   * Comparación coherente con el KPI diario "Turnos Reservados (Hoy)": HOY vs el
   * MISMO día de la semana pasada (ambos = SUM(booked_count) de ESE único día).
   * `bookedDiff` puede ser 0 o negativo: refleja la realidad, no un total inflado.
   */
  async getWeeklyComparison(dateKey: string) {
    // Sin round-trip por `new Date()` (que corría el día): trabajamos con el
    // string de fecha calendario y solo restamos 7 días para el día equivalente.
    const prevDateKey = format(subDays(parseLocalDateKey(dateKey), 7), "yyyy-MM-dd");

    const getStats = async (day: string) => {
      const res = await prisma.$queryRaw<{ total_booked: bigint; expected: bigint; present: bigint }[]>`
        SELECT
          COALESCE(SUM(s.booked_count), 0) as total_booked,
          COUNT(b.id) as expected,
          SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present
        FROM slots s
        LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
        LEFT JOIN attendances a ON a.booking_id = b.id
        WHERE s.date = ${day}::date
      `;
      const r = res[0] || { total_booked: 0n, expected: 0n, present: 0n };
      const expected = Number(r.expected);
      const present = Number(r.present);
      return {
        totalBooked: Number(r.total_booked),
        attendanceRate: expected > 0 ? (present / expected) * 100 : 0,
      };
    };

    const current = await getStats(dateKey);
    const prev = await getStats(prevDateKey);

    return {
      current,
      previous: prev,
      bookedDiff: current.totalBooked - prev.totalBooked,
      attendanceDiff: current.attendanceRate - prev.attendanceRate,
    };
  }
};
