import { randomUUID } from "node:crypto";

import { addDays, format } from "date-fns";

import {
  CANCELLATION_MIN_HOURS,
  ROLES,
  TIMEZONE,
  type Role,
} from "@/lib/constants";
import {
  FIRST_TIME_RULE_SLUGS,
  KINESIO_SLUG,
  classifyFranja,
  firstTimeBlockedMessage,
  firstTimeGridFromFranjas,
  getFirstTimeRule,
  isFirstTimeDateBlocked,
  isFirstTimeSlotAllowed,
  isValidFirstTimeGridSlot,
  type Franja,
} from "@/lib/first-time-rule";
import { BOOKING_CONFIG } from "@/lib/booking-config";
import { parseLocalDateKey, toLocalDateKey } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { BusinessError } from "@/server/errors";
import { blockService } from "@/server/services/block.service";

/**
 * Capa de servicio de reservas — LO CRÍTICO.
 *
 * La reserva y la cancelación NUNCA leen cupos y luego escriben desde la app:
 * delegan en las funciones atómicas de Postgres `book_slot` / `cancel_booking`
 * (vía $queryRaw), que resuelven la concurrencia dentro de una transacción.
 * Esto evita sobre-reservas ante clics simultáneos.
 *
 * Las funciones señalan condiciones de negocio con errores cuyo texto contiene
 * un código conocido; acá los traducimos a mensajes claros en español y nunca
 * exponemos el error crudo de Postgres.
 */

// Código que lanza la función (en el mensaje) → mensaje para el usuario.
const ERROR_MESSAGES = {
  SLOT_FULL: "Esa franja se quedó sin cupos. Probá con otro horario.",
  ALREADY_BOOKED: "Ya tenés una reserva en esa franja.",
  SLOT_NOT_FOUND: "La franja no existe o fue eliminada.",
  SLOT_BLOCKED: "Esa franja está cerrada y no admite reservas.",
  BOOKING_NOT_FOUND: "No encontramos la reserva.",
  FORBIDDEN: "No tenés permiso para esta acción.",
} as const;

/** Traduce un error de Postgres a un BusinessError con mensaje claro. */
function rethrowAsBusiness(error: unknown): never {
  const parts: string[] = [];
  if (error && typeof error === "object") {
    const e = error as { message?: string; meta?: { message?: string } };
    if (e.meta?.message) parts.push(e.meta.message);
    if (e.message) parts.push(e.message);
  } else {
    parts.push(String(error));
  }
  const haystack = parts.join(" | ");

  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (haystack.includes(code)) throw new BusinessError(message);
  }

  logger.error("Error de base no mapeado en reserva/cancelación", {
    error: haystack,
  });
  throw new BusinessError(
    "No se pudo completar la operación. Intentá nuevamente.",
  );
}

export const bookingService = {
  /**
   * Reserva un cupo de la franja. La capacidad y el bloqueo se validan de
   * forma atómica dentro de `book_slot`; acá solo agregamos un pre-chequeo
   * amable de existencia y de que la franja sea futura.
   *
   * Para el PRIMER turno de REHAB del paciente se valida la ventana de
   * días/horarios (ver más abajo). Si el paciente es `esPrimeraVez` (primera
   * reserva de cualquier servicio) se marca el tratamiento de 1 mes; esa lógica
   * es independiente de la ventana de REHAB.
   */
  async book(params: {
    slotId: string;
    userId: string;
    serviceId: string;
    notes?: string | null;
    esPrimeraVez?: boolean;
  }): Promise<BookResult> {
    const { slotId, userId, serviceId, notes, esPrimeraVez } = params;

    // Pre-chequeo + datos de la franja (para el evento posterior).
    const check = await prisma.$queryRaw<
      {
        is_future: boolean;
        date: string;
        start_time: string;
        end_time: string;
        day_of_week: number;
        start_hour: number;
        service_id: string | null;
        service_slug: string | null;
      }[]
    >`
      SELECT ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now() AS is_future,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             extract(dow FROM s.date)::int AS day_of_week,
             extract(hour FROM s.start_time)::int AS start_hour,
             s.service_id::text AS service_id,
             sv.slug AS service_slug
      FROM slots s
      LEFT JOIN services sv ON sv.id = s.service_id
      WHERE s.id = ${slotId}::uuid
    `;
    if (check.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.SLOT_NOT_FOUND);
    }
    const slot = check[0]!;
    if (!slot.is_future) {
      throw new BusinessError("Esa franja ya pasó. Elegí un horario futuro.");
    }

    // ── Bloqueos de la tabla blocks (grano grueso) ──────────────────────
    const blockCheck = await blockService.checkSlot(
      slot.date,
      slot.start_time,
      slot.service_id,
    );
    if (blockCheck.totalBlocked) {
      throw new BusinessError("Esa franja está bloqueada y no admite reservas.");
    }

    let isPrimerizo = esPrimeraVez ?? false;
    const firstTimeRuleForBlock = getFirstTimeRule(slot.service_slug);
    if (firstTimeRuleForBlock && !isPrimerizo) {
       isPrimerizo = !(await this.hasClearedFirstTime(userId, firstTimeRuleForBlock.slug));
    }

    if (blockCheck.firstTimeBlocked && isPrimerizo) {
      throw new BusinessError(
        "Esa franja no está disponible para tu primer turno. Probá con otro horario.",
      );
    }

    // ── Regla acotada: PRIMER turno del servicio (por servicio) ───────────
    // Aplica solo a servicios con regla (ver first-time-rule.ts). La restricción
    // de ventana se mantiene hasta que el paciente ASISTIÓ a una sesión de ESE
    // servicio (asistencia PRESENT); ver `hasClearedFirstTime`. Mientras no haya
    // un PRESENT, TODA reserva nueva de ese servicio debe caer en ventana, sin
    // importar cuántas futuras ya tenga. Validamos contra el servicio REAL de la
    // franja (no un parámetro que el cliente podría falsear): el servidor es la
    // verdad; la UI solo refleja.
    //
    // Concurrencia: el estado "libre" solo se activa al marcar asistencia
    // PRESENT (acción del profesional), nunca desde el flujo de reserva. Por eso
    // dos reservas casi simultáneas leen ambas "no libre" → ambas quedan
    // limitadas a la ventana y ninguna fuera de ventana puede colarse.
    const rule = getFirstTimeRule(slot.service_slug);
    if (rule && slot.service_id) {
      const cleared = await this.hasClearedFirstTime(userId, rule.slug);
      if (!cleared) {
        // Excepción puntual por fecha (solo primerizos): si el día de la franja
        // está bloqueado para el primer turno de ese servicio, se rechaza. No
        // toca a no-primerizos (no entran acá) ni a la carga del profesional
        // (adminBook). `slot.date` es la fecha de calendario (día local) de la
        // franja, así que compara el día correcto.
        if (isFirstTimeDateBlocked(rule.slug, slot.date)) {
          throw new BusinessError(firstTimeBlockedMessage(rule.slug, slot.date));
        }
        // Autoridad del modo especial: si el servicio usa turnos individuales
        // (kinesio primer turno), la franja POR HORA no es válida → debe usar el
        // flujo de 40 min. Solo aplica al camino del paciente (este `book`).
        if (rule.firstTimeSlotMinutes) {
          throw new BusinessError(
            "Tu primer turno de kinesiología es en turnos individuales de 40 minutos. Elegilo desde la lista de turnos disponibles.",
          );
        }
        if (!isFirstTimeSlotAllowed(rule, slot.day_of_week, slot.start_hour)) {
          throw new BusinessError(rule.message);
        }
      }
    }

    try {
      // book_slot copia service_id del slot automáticamente (ver función SQL).
      const rows = await prisma.$queryRaw<{ booking_id: string | null }[]>`
        SELECT b.id AS booking_id
        FROM book_slot(${slotId}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
      `;

      // ── Marcar primera vez completada y asignar tratamiento ────────────
      if (esPrimeraVez) {
        await prisma.$executeRaw`
          UPDATE "User"
          SET es_primera_vez = false,
              tratamiento_inicio = now(),
              tratamiento_fin = now() + interval '1 month',
              numero_sesion_actual = 1
          WHERE id = ${userId}
        `;
      } else {
        // Incrementar número de sesión
        await prisma.$executeRaw`
          UPDATE "User"
          SET numero_sesion_actual = numero_sesion_actual + 1
          WHERE id = ${userId} AND role = 'PATIENT'
        `;
      }

      logger.info("Reserva creada", { slotId, userId, serviceId });
      return {
        bookingId: rows[0]?.booking_id ?? null,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        isFirstTime: esPrimeraVez ?? false,
      };
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * El profesional carga un turno a un paciente. Dentro de cupo usa `book_slot`
   * (atómico). Si la franja está llena y `override`, inserta un SOBRECUPO de
   * forma atómica (lock `FOR UPDATE`), marcado (`is_override`) y auditado
   * (`override_by`). El sobrecupo excepciona SOLO el cupo: se siguen respetando
   * franja bloqueada, duplicado y la ventana del primer REHAB.
   */
  async adminBook(params: {
    slotId: string;
    userId: string;
    notes?: string | null;
    override: boolean;
    adminId: string;
  }): Promise<{ bookingId: string | null; override: boolean }> {
    const { slotId, userId, notes, override, adminId } = params;

    const rows = await prisma.$queryRaw<
      {
        service_id: string | null;
        service_slug: string | null;
        dow: number;
        hour: number;
        capacity: number;
        booked_count: number;
        is_blocked: boolean;
        is_future: boolean;
      }[]
    >`
      SELECT s.service_id::text AS service_id,
             sv.slug AS service_slug,
             extract(dow FROM s.date)::int AS dow,
             extract(hour FROM s.start_time)::int AS hour,
             s.capacity, s.booked_count, s.is_blocked,
             ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now() AS is_future
      FROM slots s
      LEFT JOIN services sv ON sv.id = s.service_id
      WHERE s.id = ${slotId}::uuid
    `;
    const slot = rows[0];
    if (!slot) throw new BusinessError(ERROR_MESSAGES.SLOT_NOT_FOUND);
    if (slot.is_blocked) throw new BusinessError(ERROR_MESSAGES.SLOT_BLOCKED);
    if (!slot.is_future) {
      throw new BusinessError("Esa franja ya pasó. Elegí un horario futuro.");
    }

    // Regla del primer turno del servicio (se respeta incluso en sobrecupo).
    const rule = getFirstTimeRule(slot.service_slug);
    if (rule && slot.service_id) {
      const cleared = await this.hasClearedFirstTime(userId, rule.slug);
      if (!cleared && !isFirstTimeSlotAllowed(rule, slot.dow, slot.hour)) {
        throw new BusinessError(rule.message);
      }
    }

    const wasFull = slot.booked_count >= slot.capacity;

    if (override && wasFull) {
      const bookingId = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM slots WHERE id = ${slotId}::uuid FOR UPDATE`;
        const dup = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM bookings
          WHERE slot_id = ${slotId}::uuid AND user_id = ${userId}::text AND status <> 'CANCELLED'
        `;
        if (dup.length > 0) throw new BusinessError(ERROR_MESSAGES.ALREADY_BOOKED);
        const ins = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO bookings (slot_id, user_id, service_id, status, notes, is_override, override_by)
          VALUES (${slotId}::uuid, ${userId}::text, ${slot.service_id}::uuid, 'CONFIRMED',
                  ${notes ?? null}, true, ${adminId})
          RETURNING id
        `;
        await tx.$executeRaw`
          UPDATE slots SET booked_count = booked_count + 1 WHERE id = ${slotId}::uuid
        `;
        return ins[0]?.id ?? null;
      });
      logger.info("Sobrecupo cargado", { slotId, userId, adminId });
      return { bookingId, override: true };
    }

    // Dentro de cupo (o sin override): book_slot resuelve la concurrencia.
    try {
      const booked = await prisma.$queryRaw<{ booking_id: string | null }[]>`
        SELECT b.id AS booking_id
        FROM book_slot(${slotId}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
      `;
      logger.info("Turno cargado por profesional", { slotId, userId, adminId });
      return { bookingId: booked[0]?.booking_id ?? null, override: false };
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * Cancela una reserva propia. Para pacientes se aplica la ventana mínima de
   * antelación (`CANCELLATION_MIN_HOURS`); la liberación del cupo la hace
   * `cancel_booking` de forma atómica.
   */
  async cancel(params: {
    bookingId: string;
    userId: string;
    role: Role;
  }): Promise<void> {
    const { bookingId, userId, role } = params;

    const rows = await prisma.$queryRaw<{ starts_at: Date }[]>`
      SELECT ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) AS starts_at
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.id = ${bookingId}::uuid
        AND b.status <> 'CANCELLED'
        AND b.user_id = ${userId}::text
    `;
    if (rows.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (role === ROLES.PATIENT) {
      const limit = Date.now() + CANCELLATION_MIN_HOURS * 3_600_000;
      if (rows[0]!.starts_at.getTime() < limit) {
        throw new BusinessError(
          `Solo podés cancelar con al menos ${CANCELLATION_MIN_HOURS}h de antelación. Escribinos a recepción.`,
        );
      }
    }

    try {
      // $executeRaw no intenta deserializar el resultado (cancel_booking
      // devuelve la fila bookings / void).
      await prisma.$executeRaw`
        SELECT cancel_booking(${bookingId}::uuid, ${userId}::text)
      `;
      logger.info("Reserva cancelada", { bookingId, userId, role });
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * Cancela como ADMIN: resuelve el dueño de la reserva y llama a la función
   * con ese user_id (la función valida pertenencia). Sin ventana de antelación.
   */
  async adminCancel(bookingId: string, adminId?: string): Promise<void> {
    const rows = await prisma.$queryRaw<{ user_id: string }[]>`
      SELECT user_id FROM bookings
      WHERE id = ${bookingId}::uuid AND status <> 'CANCELLED'
    `;
    if (rows.length === 0) {
      throw new BusinessError(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }
    const ownerId = rows[0]!.user_id;
    try {
      await prisma.$executeRaw`
        SELECT cancel_booking(${bookingId}::uuid, ${ownerId}::text)
      `;
      await this.auditCancel(bookingId, adminId);
      logger.info("Reserva cancelada por admin", { bookingId, adminId });
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /**
   * Cancela como ADMIN todos los turnos FUTUROS de una serie (turno fijo). Cada
   * fecha pasa por `cancel_booking` (atómico, libera cupo). Los pasados no se
   * tocan. Devuelve cuántos se cancelaron.
   */
  async adminCancelSeries(recurrenceId: string, adminId?: string): Promise<number> {
    const future = await prisma.$queryRaw<{ id: string; user_id: string }[]>`
      SELECT b.id, b.user_id
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.recurrence_id = ${recurrenceId}::uuid
        AND b.status <> 'CANCELLED'
        AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
    `;
    for (const row of future) {
      await prisma.$executeRaw`
        SELECT cancel_booking(${row.id}::uuid, ${row.user_id}::text)
      `;
      await this.auditCancel(row.id, adminId);
    }
    logger.info("Serie cancelada por admin", { recurrenceId, adminId, cancelled: future.length });
    return future.length;
  },

  /** Auditoría de cancelación (best-effort: no rompe si faltan las columnas). */
  async auditCancel(bookingId: string, adminId?: string): Promise<void> {
    if (!adminId) return;
    try {
      await prisma.$executeRaw`
        UPDATE bookings SET cancelled_by = ${adminId}, cancelled_at = now()
        WHERE id = ${bookingId}::uuid
      `;
    } catch {
      /* columnas cancelled_by/at pendientes de migración */
    }
  },

  /**
   * Reservas CONFIRMADAS de un paciente en una fecha concreta. Sirve para avisar
   * que ya tiene un turno ese día (posible duplicado) antes de sacar otro.
   */
  async getSameDayBookings(userId: string, dateKey: string): Promise<SameDayBooking[]> {
    const rows = await prisma.$queryRaw<
      { id: string; start_time: string; end_time: string; service_name: string | null }[]
    >`
      SELECT b.id,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             sv.name AS service_name
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN services sv ON sv.id = b.service_id
      WHERE b.user_id = ${userId}::text
        AND b.status = 'CONFIRMED'
        AND s.date = ${dateKey}::date
      ORDER BY s.start_time
    `;
    return rows.map((r) => ({
      bookingId: r.id,
      startTime: r.start_time,
      endTime: r.end_time,
      serviceName: r.service_name,
    }));
  },

  /** Reservas de un paciente (próximas e históricas), listo para mostrar. */
  async listForUser(userId: string): Promise<MyBooking[]> {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        status: string;
        notes: string | null;
        date: string;
        start_time: string;
        end_time: string;
        starts_at: Date;
        service_name: string | null;
        service_color: string | null;
      }[]
    >`
      SELECT b.id, b.status, b.notes,
             s.date::text AS date,
             to_char(s.start_time, 'HH24:MI') AS start_time,
             to_char(s.end_time, 'HH24:MI') AS end_time,
             ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) AS starts_at,
             sv.name AS service_name,
             sv.color AS service_color
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      LEFT JOIN services sv ON sv.id = b.service_id
      WHERE b.user_id = ${userId}::text
      ORDER BY s.date DESC, s.start_time DESC
    `;

    // Agrupación de series (turnos fijos). Resiliente: si la columna aún no
    // existe (migración pendiente), no hay series y la lista no se rompe.
    let recMap = new Map<string, string>();
    try {
      const rec = await prisma.$queryRaw<{ id: string; recurrence_id: string | null }[]>`
        SELECT id, recurrence_id::text AS recurrence_id
        FROM bookings
        WHERE user_id = ${userId}::text AND recurrence_id IS NOT NULL
      `;
      recMap = new Map(rec.filter((r) => r.recurrence_id).map((r) => [r.id, r.recurrence_id!]));
    } catch {
      recMap = new Map();
    }

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      notes: r.notes,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      startsAtISO: r.starts_at.toISOString(),
      serviceName: r.service_name,
      serviceColor: r.service_color,
      recurrenceId: recMap.get(r.id) ?? null,
    }));
  },

  /**
   * ¿El paciente ya CUMPLIÓ el primer turno de un servicio (Opción B)?
   *
   * La restricción de ventana se levanta SOLO cuando existe una reserva de ESE
   * servicio con asistencia PRESENT. Tener reservas futuras NO alcanza: hasta
   * que haya un PRESENT, toda reserva nueva del servicio debe caer en ventana.
   *
   * Fuente de verdad única: la usan la UI y el servidor. Identifica el servicio
   * por `slug` (estable), nunca por nombre.
   */
  async hasClearedFirstTime(userId: string, slug: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM bookings b
        JOIN attendances a ON a.booking_id = b.id
        WHERE b.user_id = ${userId}::text
          AND b.service_id = (SELECT id FROM services WHERE slug = ${slug})
          AND a.status = 'PRESENT'
      ) AS ok
    `;
    return rows[0]?.ok ?? false;
  },

  /**
   * ¿El paciente YA tiene reservado (a futuro) su turno especial de 40 min de
   * primer turno de kinesio? El horario especial es UNA sola vez: mientras haya
   * una reserva CONFIRMED sobre una franja `is_first_time` de kinesio con fecha
   * futura, no se le ofrece —ni puede sacar— otro. Recién cuando ASISTA
   * (PRESENT → `hasClearedFirstTime`) pasa a los turnos normales por hora.
   *
   * Identifica el servicio por `slug` (estable), nunca por nombre.
   */
  async hasUpcomingFirstTimeKinesioBooking(userId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM bookings b
        JOIN slots s ON s.id = b.slot_id
        WHERE b.user_id = ${userId}::text
          AND b.status = 'CONFIRMED'
          AND s.is_first_time = true
          AND s.service_id = (SELECT id FROM services WHERE slug = ${KINESIO_SLUG})
          AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
      ) AS ok
    `;
    return rows[0]?.ok ?? false;
  },

  /**
   * Slugs con regla de primer turno que el paciente TODAVÍA no cumplió (sigue
   * restringido a ventana). Para que la UI refleje la restricción por servicio.
   */
  async getFirstTimeRestrictedSlugs(userId: string): Promise<string[]> {
    const restricted: string[] = [];
    for (const slug of FIRST_TIME_RULE_SLUGS) {
      const cleared = await this.hasClearedFirstTime(userId, slug);
      if (!cleared) restricted.push(slug);
    }
    return restricted;
  },

  // ── Caso especial: primer turno de Kinesiología en turnos de 40 min ────────
  // Aislado detrás de (kinesio + primerizo). NO toca el flujo por hora.

  /**
   * Franjas ACTIVAS de la plantilla de un servicio, agrupadas por día de la
   * semana (0=domingo, igual que Date.getDay()). Fuente de verdad de los
   * HORARIOS/cortes de la grilla de 40 min. Loguea si alguna franja cruza el
   * mediodía (no se puede clasificar mañana/tarde).
   */
  async getTemplateFranjasByDow(serviceId: string): Promise<Map<number, Franja[]>> {
    const rows = await prisma.$queryRaw<{ dow: number; start: string; end: string }[]>`
      SELECT day_of_week AS dow,
             to_char(start_time, 'HH24:MI') AS start,
             to_char(end_time, 'HH24:MI')   AS end
      FROM slot_templates
      WHERE service_id = ${serviceId}::uuid AND active
    `;
    const map = new Map<number, Franja[]>();
    for (const r of rows) {
      if (classifyFranja({ start: r.start, end: r.end }) === null) {
        logger.warn("Franja de plantilla cruza el mediodía; no se clasifica para 40 min", {
          serviceId,
          dow: r.dow,
          franja: `${r.start}-${r.end}`,
        });
      }
      const arr = map.get(r.dow) ?? [];
      arr.push({ start: r.start, end: r.end });
      map.set(r.dow, arr);
    }
    return map;
  },

  /**
   * Disponibilidad VIRTUAL de turnos individuales de 40 min para el primer turno
   * de kinesio. La grilla es la INTERSECCIÓN plantilla ∩ regla de negocio (los
   * horarios salen de la plantilla; qué parte del día, de la regla). No
   * materializa nada; marca como tomados los turnos ya reservados.
   *
   * Devuelve `{ alreadyBooked, days }`:
   *  - `days: []` si el paciente ya cumplió o el servicio no tiene el modo.
   *  - `alreadyBooked: true` (y `days: []`) si YA reservó su turno especial a
   *    futuro: el horario especial es UNA sola vez, así que en vez de la grilla
   *    la UI muestra el mensaje de "ya tenés tu primer turno reservado".
   */
  async getFirstTimeKinesioAvailability(
    userId: string,
  ): Promise<{
    alreadyBooked: boolean;
    days: { date: string; turnos: { startTime: string; endTime: string; available: boolean }[] }[];
  }> {
    const rule = getFirstTimeRule(KINESIO_SLUG);
    if (!rule?.firstTimeSlotMinutes) return { alreadyBooked: false, days: [] };
    if (await this.hasClearedFirstTime(userId, KINESIO_SLUG)) {
      return { alreadyBooked: false, days: [] };
    }
    // El especial es una sola vez: si ya tiene un 40 min a futuro, no ofrecemos
    // la grilla; la UI muestra el mensaje correspondiente.
    if (await this.hasUpcomingFirstTimeKinesioBooking(userId)) {
      return { alreadyBooked: true, days: [] };
    }

    const svc = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM services WHERE slug = ${KINESIO_SLUG}
    `;
    const serviceId = svc[0]?.id;
    if (!serviceId) return { alreadyBooked: false, days: [] };

    // Horarios reales de cada día (plantilla de Kinesiología).
    const franjasByDow = await this.getTemplateFranjasByDow(serviceId);

    // Turnos de 40 min ya tomados (materializados y con cupo ocupado).
    const takenRows = await prisma.$queryRaw<{ d: string; t: string }[]>`
      SELECT to_char(date, 'YYYY-MM-DD') AS d, to_char(start_time, 'HH24:MI') AS t
      FROM slots
      WHERE service_id = ${serviceId}::uuid
        AND is_first_time = true
        AND booked_count >= 1
        AND date >= current_date
    `;
    const taken = new Set(takenRows.map((r) => `${r.d}|${r.t}`));

    // "Ahora" en hora de Argentina, para descartar turnos pasados de hoy.
    const nowRows = await prisma.$queryRaw<{ now_key: string; now_hm: string }[]>`
      SELECT to_char(now() AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD') AS now_key,
             to_char(now() AT TIME ZONE ${TIMEZONE}, 'HH24:MI')   AS now_hm
    `;
    const nowKey = nowRows[0]?.now_key ?? "";
    const nowHm = nowRows[0]?.now_hm ?? "";

    const today = parseLocalDateKey(toLocalDateKey(new Date()));
    const out: {
      date: string;
      turnos: { startTime: string; endTime: string; available: boolean }[];
    }[] = [];

    for (let i = 0; i < BOOKING_CONFIG.generationDays; i++) {
      const d = addDays(today, i);
      const dateKey = format(d, "yyyy-MM-dd");
      // Excepción puntual: fecha bloqueada para el primer turno → no se ofrece.
      // `dateKey` sale de `today` en hora Argentina, así que compara el día local.
      if (isFirstTimeDateBlocked(KINESIO_SLUG, dateKey)) continue;
      const grid = firstTimeGridFromFranjas(rule, d.getDay(), franjasByDow.get(d.getDay()) ?? []);
      if (grid.length === 0) continue;

      const turnos = grid
        .filter((g) => !(dateKey === nowKey && g.start <= nowHm))
        .map((g) => ({
          startTime: g.start,
          endTime: g.end,
          available: !taken.has(`${dateKey}|${g.start}`),
        }));
      if (turnos.length > 0) out.push({ date: dateKey, turnos });
    }
    return { alreadyBooked: false, days: out };
  },

  /**
   * Reserva un turno individual de 40 min del primer turno de kinesio. Valida
   * (primerizo + día en ventana + hora alineada a la grilla + futuro),
   * materializa el slot cap 1 de forma atómica (índice único parcial) y reserva
   * con `book_slot` (mismo mecanismo de siempre → concurrencia garantizada).
   */
  async bookFirstTimeKinesio(params: {
    userId: string;
    date: string;
    startTime: string;
    notes?: string | null;
  }): Promise<{
    bookingId: string | null;
    serviceId: string;
    date: string;
    startTime: string;
    endTime: string;
  }> {
    const { userId, date, startTime, notes } = params;

    const rule = getFirstTimeRule(KINESIO_SLUG);
    if (!rule?.firstTimeSlotMinutes) {
      throw new BusinessError("Este modo no está disponible.");
    }
    if (await this.hasClearedFirstTime(userId, KINESIO_SLUG)) {
      throw new BusinessError("Ya no estás en tu primer turno de kinesiología.");
    }
    // Autoridad del servidor: el turno especial de 40 min es UNA sola vez. Si el
    // paciente ya tiene uno reservado a futuro, se rechaza (no puede pre-reservar
    // varios). Recién cuando asista pasa a los turnos normales por hora.
    if (await this.hasUpcomingFirstTimeKinesioBooking(userId)) {
      throw new BusinessError(
        "Ya tenés tu primer turno de kinesiología reservado. Cuando asistas, vas a poder sacar turnos normales.",
      );
    }
    // Excepción puntual por fecha (solo primerizos): `date` es la fecha-clave en
    // hora Argentina que eligió el paciente. Autoridad del servidor.
    if (isFirstTimeDateBlocked(KINESIO_SLUG, date)) {
      throw new BusinessError(firstTimeBlockedMessage(KINESIO_SLUG, date));
    }

    const svc = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM services WHERE slug = ${KINESIO_SLUG}
    `;
    const serviceId = svc[0]?.id;
    if (!serviceId) throw new BusinessError("Servicio no encontrado.");

    // Autoridad del servidor: el turno debe caer en la grilla INTERSECTADA
    // (franjas reales de la plantilla ∩ parte del día permitida por la regla).
    // Un turno fuera de las franjas de la plantilla se rechaza.
    const day = parseLocalDateKey(date);
    const franjas = (await this.getTemplateFranjasByDow(serviceId)).get(day.getDay()) ?? [];
    const { valid, endTime } = isValidFirstTimeGridSlot(rule, day.getDay(), franjas, startTime);
    if (!valid || !endTime) {
      throw new BusinessError("Ese horario no es un turno válido para el primer turno de kinesiología.");
    }

    const fut = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT ((${date}::date + ${startTime}::time) AT TIME ZONE ${TIMEZONE}) > now() AS ok
    `;
    if (!fut[0]?.ok) {
      throw new BusinessError("Ese turno ya pasó. Elegí uno futuro.");
    }

    // Materialización atómica: 1 solo slot por (servicio, fecha, hora) gracias al
    // índice único parcial. Si ya existe (otro lo materializó), lo tomamos.
    const ins = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO slots (professional_id, service_id, date, start_time, end_time, capacity, is_first_time)
      VALUES (NULL, ${serviceId}::uuid, ${date}::date, ${startTime}::time, ${endTime}::time, 1, true)
      ON CONFLICT (service_id, date, start_time) WHERE is_first_time DO NOTHING
      RETURNING id
    `;
    let slotId = ins[0]?.id ?? null;
    if (!slotId) {
      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM slots
        WHERE service_id = ${serviceId}::uuid AND is_first_time = true
          AND date = ${date}::date AND start_time = ${startTime}::time
      `;
      slotId = existing[0]?.id ?? null;
    }
    if (!slotId) throw new BusinessError("No se pudo reservar el turno. Reintentá.");

    try {
      const booked = await prisma.$queryRaw<{ booking_id: string | null }[]>`
        SELECT b.id AS booking_id
        FROM book_slot(${slotId}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
      `;
      logger.info("Primer turno de kinesio (40 min) reservado", { userId, date, startTime });
      return { bookingId: booked[0]?.booking_id ?? null, serviceId, date, startTime, endTime };
    } catch (error) {
      rethrowAsBusiness(error);
    }
  },

  /** Horarios de inicio disponibles (distintos) de un servicio a futuro. */
  async getServiceStartTimes(serviceId: string): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ start_time: string }[]>`
      SELECT DISTINCT to_char(start_time, 'HH24:MI') AS start_time
      FROM slots
      WHERE service_id = ${serviceId}::uuid
        AND date >= current_date
        AND NOT is_blocked
        AND NOT is_first_time
      ORDER BY start_time
    `;
    return rows.map((r) => r.start_time);
  },

  /**
   * Turno fijo: genera una reserva por cada fecha del rango cuyo día de la
   * semana esté en `daysOfWeek`, al horario `startTime`, para el servicio dado.
   *
   * Cada fecha se reserva con `book_slot` (lock atómico) → no sobre-reserva. La
   * generación es secuencial (sin transacción gigante). Las fechas sin cupo o
   * sin franja NO abortan la operación: se reportan por separado. Respeta la
   * regla del primer turno de REHAB (cada fecha debe caer en ventana mientras el
   * paciente no esté libre).
   */
  async bookSeries(params: {
    userId: string;
    serviceId: string;
    daysOfWeek: number[];
    startTime: string;
    toDate: string;
    notes?: string | null;
    esPrimeraVez?: boolean;
  }): Promise<SeriesResult> {
    const { userId, serviceId, daysOfWeek, startTime, toDate, notes, esPrimeraVez } = params;

    // Guardia: la columna recurrence_id debe existir (migración aplicada).
    try {
      await prisma.$queryRaw`SELECT recurrence_id FROM bookings LIMIT 1`;
    } catch {
      throw new BusinessError(
        "Los turnos fijos no están disponibles todavía. Probá más tarde.",
      );
    }

    const today = parseLocalDateKey(toLocalDateKey(new Date()));
    const end = parseLocalDateKey(toDate);
    if (end < today) {
      throw new BusinessError("La fecha final ya pasó. Elegí una fecha futura.");
    }
    // Horizonte máximo para no generar series gigantes.
    const maxEnd = addDays(today, 120);
    const lastDate = end > maxEnd ? maxEnd : end;

    // ¿El servicio tiene regla de primer turno? ¿El paciente ya la cumplió?
    const svc = await prisma.$queryRaw<{ slug: string }[]>`
      SELECT slug FROM services WHERE id = ${serviceId}::uuid
    `;
    const rule = getFirstTimeRule(svc[0]?.slug);
    const cleared = rule ? await this.hasClearedFirstTime(userId, rule.slug) : true;

    const recurrenceId = randomUUID();
    const days = new Set(daysOfWeek);
    const results: SeriesItemResult[] = [];

    for (let d = today; d <= lastDate; d = addDays(d, 1)) {
      if (!days.has(d.getDay())) continue;
      const dateKey = format(d, "yyyy-MM-dd");

      const slotRows = await prisma.$queryRaw<
        { id: string; end_time: string; dow: number; hour: number }[]
      >`
        SELECT s.id,
               to_char(s.end_time, 'HH24:MI') AS end_time,
               extract(dow FROM s.date)::int AS dow,
               extract(hour FROM s.start_time)::int AS hour
        FROM slots s
        WHERE s.service_id = ${serviceId}::uuid
          AND s.date = ${dateKey}::date
          AND s.start_time = ${startTime}::time
          AND NOT s.is_blocked
          AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) > now()
      `;
      const slot = slotRows[0];
      if (!slot) {
        results.push({ date: dateKey, startTime, endTime: null, status: "no_slot" });
        continue;
      }

      if (rule && !cleared && !isFirstTimeSlotAllowed(rule, slot.dow, slot.hour)) {
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status: "rehab_window" });
        continue;
      }

      // Bloqueos de la tabla blocks (grano grueso).
      const seriesBlock = await blockService.checkSlot(
        dateKey,
        startTime,
        serviceId,
      );
      if (seriesBlock.totalBlocked || (seriesBlock.firstTimeBlocked && esPrimeraVez)) {
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status: "no_slot" });
        continue;
      }

      try {
        const booked = await prisma.$queryRaw<{ booking_id: string | null }[]>`
          SELECT b.id AS booking_id
          FROM book_slot(${slot.id}::uuid, ${userId}::text, ${notes ?? null}::text) AS b
        `;
        const bookingId = booked[0]?.booking_id ?? null;
        if (bookingId) {
          await prisma.$executeRaw`
            UPDATE bookings SET recurrence_id = ${recurrenceId}::uuid WHERE id = ${bookingId}::uuid
          `;
        }
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status: "booked" });
      } catch (error) {
        const msg = String((error as { message?: string })?.message ?? error);
        const status: SeriesItemStatus = msg.includes("SLOT_FULL")
          ? "full"
          : msg.includes("ALREADY_BOOKED")
            ? "already"
            : "error";
        results.push({ date: dateKey, startTime, endTime: slot.end_time, status });
      }
    }

    const booked = results.filter((r) => r.status === "booked").length;
    logger.info("Serie creada", { userId, serviceId, recurrenceId, booked, total: results.length });
    return { recurrenceId, results, booked, total: results.length };
  },

  /** Cancela todas las reservas FUTURAS de una serie (las pasadas no se tocan). */
  async cancelSeries(params: { recurrenceId: string; userId: string }): Promise<number> {
    const { recurrenceId, userId } = params;
    const future = await prisma.$queryRaw<{ id: string }[]>`
      SELECT b.id
      FROM bookings b
      JOIN slots s ON s.id = b.slot_id
      WHERE b.recurrence_id = ${recurrenceId}::uuid
        AND b.user_id = ${userId}::text
        AND b.status <> 'CANCELLED'
        AND ((s.date + s.start_time) AT TIME ZONE ${TIMEZONE}) >= now()
    `;
    for (const row of future) {
      await prisma.$executeRaw`
        SELECT cancel_booking(${row.id}::uuid, ${userId}::text)
      `;
    }
    logger.info("Serie cancelada", { recurrenceId, userId, cancelled: future.length });
    return future.length;
  },
};

export type SeriesItemStatus =
  | "booked"
  | "no_slot"
  | "full"
  | "already"
  | "rehab_window"
  | "error";

export interface SameDayBooking {
  bookingId: string;
  startTime: string;
  endTime: string;
  serviceName: string | null;
}

export interface SeriesItemResult {
  date: string;
  startTime: string;
  endTime: string | null;
  status: SeriesItemStatus;
}

export interface SeriesResult {
  recurrenceId: string;
  results: SeriesItemResult[];
  booked: number;
  total: number;
}

export interface BookResult {
  bookingId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isFirstTime: boolean;
}

export interface MyBooking {
  id: string;
  status: string;
  notes: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAtISO: string;
  serviceName: string | null;
  serviceColor: string | null;
  recurrenceId: string | null;
}
