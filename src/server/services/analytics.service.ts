import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";
import { toLocalDateKey } from "@/lib/datetime";

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
    const res = await prisma.$queryRaw<
      { time: string; capacity: number; booked: number }[]
    >`
      SELECT 
        to_char(start_time, 'HH24:MI') as time,
        capacity,
        booked_count as booked
      FROM slots
      WHERE date = ${dateKey}::date
      ORDER BY start_time
    `;

    return res.map((r) => ({
      time: r.time,
      capacity: r.capacity,
      booked: r.booked,
      free: r.capacity - r.booked,
      occupancyRate: r.capacity > 0 ? (r.booked / r.capacity) * 100 : 0,
    }));
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
  async getWeeklyComparison(endDateKey: string) {
    const currentEnd = new Date(endDateKey);
    const currentStart = subDays(currentEnd, 6); // 7 days total inclusive
    const prevEnd = subDays(currentStart, 1);
    const prevStart = subDays(prevEnd, 6);

    const getStats = async (start: Date, end: Date) => {
      const res = await prisma.$queryRaw<{ total_booked: bigint; expected: bigint; present: bigint }[]>`
        SELECT 
          COALESCE(SUM(s.booked_count), 0) as total_booked,
          COUNT(b.id) as expected,
          SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present
        FROM slots s
        LEFT JOIN bookings b ON b.slot_id = s.id AND b.status = 'CONFIRMED'
        LEFT JOIN attendances a ON a.booking_id = b.id
        WHERE s.date >= ${toLocalDateKey(start)}::date
          AND s.date <= ${toLocalDateKey(end)}::date
      `;
      const r = res[0] || { total_booked: 0n, expected: 0n, present: 0n };
      const expected = Number(r.expected);
      const present = Number(r.present);
      return {
        totalBooked: Number(r.total_booked),
        attendanceRate: expected > 0 ? (present / expected) * 100 : 0,
      };
    };

    const current = await getStats(currentStart, currentEnd);
    const prev = await getStats(prevStart, prevEnd);

    return {
      current,
      previous: prev,
      bookedDiff: current.totalBooked - prev.totalBooked,
      attendanceDiff: current.attendanceRate - prev.attendanceRate,
    };
  }
};
