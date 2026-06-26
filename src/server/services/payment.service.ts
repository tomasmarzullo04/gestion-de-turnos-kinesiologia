import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const DEFAULT_COPAGO = 4000;

/**
 * `true` si el error es por tablas de pagos aún inexistentes (migración no
 * corrida). Permite degradar de forma elegante en lecturas sin romper páginas.
 */
function isMissingTable(error: unknown): boolean {
  const msg = String(
    (error as { message?: string })?.message ?? error,
  ).toLowerCase();
  return msg.includes("does not exist") || msg.includes("relation");
}

export interface PaymentMovement {
  id: string;
  type: "COPAGO" | "EXTRA";
  amount: number;
  quantity: number;
  concept: string | null;
  paidAt: string; // "YYYY-MM-DD"
  patientName: string | null;
}

export interface MonthlySummary {
  totalCopagos: number;
  totalExtras: number;
  total: number;
  paymentCount: number;
  payers: number;
  prevTotal: number;
  movements: PaymentMovement[];
}

export const paymentService = {
  /** Monto vigente del copago (editable). Cae al default si no hay fila/tabla. */
  async getCopagoAmount(): Promise<number> {
    try {
      const rows = await prisma.$queryRaw<{ copago_amount: number }[]>`
        SELECT copago_amount FROM billing_settings WHERE id = 1
      `;
      return rows[0]?.copago_amount ?? DEFAULT_COPAGO;
    } catch (error) {
      if (isMissingTable(error)) return DEFAULT_COPAGO;
      throw error;
    }
  },

  /** Actualiza el monto vigente del copago. */
  async setCopagoAmount(amount: number): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO billing_settings (id, copago_amount, updated_at)
      VALUES (1, ${amount}, now())
      ON CONFLICT (id) DO UPDATE SET copago_amount = ${amount}, updated_at = now()
    `;
  },

  /**
   * Registra uno o varios copagos pagados por un paciente. El período (mes/año)
   * que alimenta Finanzas se deriva de la fecha de pago; el copago en sí NO está
   * atado a un mes: la deuda se calcula como asistencias PRESENT − copagos pagos.
   */
  async registerCopagos(input: {
    userId: string;
    quantity: number;
    unitAmount: number;
    paidAt: string;
    recordedById: string;
  }): Promise<void> {
    const total = input.quantity * input.unitAmount;
    const [y, m] = input.paidAt.split("-").map(Number);
    await prisma.$executeRaw`
      INSERT INTO payments
        (user_id, type, amount, quantity, period_month, period_year, paid_at, recorded_by_id)
      VALUES
        (${input.userId}, 'COPAGO', ${total}, ${input.quantity},
         ${m}, ${y}, ${input.paidAt}::date, ${input.recordedById})
    `;
  },

  /** Registra un cobro extra puntual (alimenta Finanzas por la fecha de pago). */
  async registerExtra(input: {
    userId: string;
    amount: number;
    concept: string;
    paidAt: string;
    recordedById: string;
  }): Promise<void> {
    const [y, m] = input.paidAt.split("-").map(Number);
    await prisma.$executeRaw`
      INSERT INTO payments
        (user_id, type, amount, quantity, period_month, period_year, concept, paid_at, recorded_by_id)
      VALUES
        (${input.userId}, 'EXTRA', ${input.amount}, 1,
         ${m}, ${y}, ${input.concept}, ${input.paidAt}::date, ${input.recordedById})
    `;
  },

  /** Anula un pago (deja registro; no borra la fila). */
  async voidPayment(input: {
    paymentId: string;
    voidedById: string;
    reason: string | null;
  }): Promise<void> {
    await prisma.$executeRaw`
      UPDATE payments
      SET voided_at = now(), voided_by_id = ${input.voidedById}, void_reason = ${input.reason}
      WHERE id = ${input.paymentId}::uuid AND voided_at IS NULL
    `;
  },

  /** Resumen económico de un mes: totales (en base), contadores y movimientos. */
  async getMonthlySummary(month: number, year: number): Promise<MonthlySummary> {
    const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };

    const empty: MonthlySummary = {
      totalCopagos: 0,
      totalExtras: 0,
      total: 0,
      paymentCount: 0,
      payers: 0,
      prevTotal: 0,
      movements: [],
    };

    try {
    const [totals, prevRows, movements] = await Promise.all([
      prisma.$queryRaw<
        {
          total_copagos: number;
          total_extras: number;
          total: number;
          payment_count: number;
          payers: number;
        }[]
      >`
        SELECT
          coalesce(sum(amount) FILTER (WHERE type = 'COPAGO'), 0)::int AS total_copagos,
          coalesce(sum(amount) FILTER (WHERE type = 'EXTRA'), 0)::int  AS total_extras,
          coalesce(sum(amount), 0)::int                                AS total,
          count(*)::int                                                AS payment_count,
          count(DISTINCT user_id)::int                                 AS payers
        FROM payments
        WHERE period_year = ${year} AND period_month = ${month} AND voided_at IS NULL
      `,
      prisma.$queryRaw<{ total: number }[]>`
        SELECT coalesce(sum(amount), 0)::int AS total
        FROM payments
        WHERE period_year = ${prev.y} AND period_month = ${prev.m} AND voided_at IS NULL
      `,
      prisma.$queryRaw<
        {
          id: string;
          type: "COPAGO" | "EXTRA";
          amount: number;
          quantity: number;
          concept: string | null;
          paid_at: string;
          patient_name: string | null;
        }[]
      >`
        SELECT p.id, p.type, p.amount, p.quantity, p.concept,
               to_char(p.paid_at AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD') AS paid_at,
               u.name AS patient_name
        FROM payments p
        LEFT JOIN "User" u ON u.id = p.user_id
        WHERE p.period_year = ${year} AND p.period_month = ${month} AND p.voided_at IS NULL
        ORDER BY p.paid_at DESC, p.recorded_at DESC
      `,
    ]);

    const t = totals[0];
    return {
      totalCopagos: t?.total_copagos ?? 0,
      totalExtras: t?.total_extras ?? 0,
      total: t?.total ?? 0,
      paymentCount: t?.payment_count ?? 0,
      payers: t?.payers ?? 0,
      prevTotal: prevRows[0]?.total ?? 0,
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: m.amount,
        quantity: m.quantity,
        concept: m.concept,
        paidAt: m.paid_at,
        patientName: m.patient_name,
      })),
    };
    } catch (error) {
      if (isMissingTable(error)) return empty;
      logger.error("Error al calcular el resumen económico", { error: String(error) });
      throw error;
    }
  },
};
