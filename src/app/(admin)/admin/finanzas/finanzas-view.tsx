"use client";

import * as React from "react";
import Link from "next/link";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Settings2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  registerExtraPaymentAction,
  updateCopagoAmountAction,
  voidPaymentAction,
} from "@/app/(admin)/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatARS, monthName, shiftMonth } from "@/lib/money";
import { type MonthlySummary, type PaymentMovement } from "@/server/services/payment.service";

interface Props {
  month: number;
  year: number;
  summary: MonthlySummary;
  copagoAmount: number;
  patients: { id: string; name: string }[];
  todayKey: string;
}

export function FinanzasView({
  month,
  year,
  summary,
  copagoAmount,
  patients,
  todayKey,
}: Props) {
  const [extraOpen, setExtraOpen] = React.useState(false);
  const [amountOpen, setAmountOpen] = React.useState(false);
  const [voiding, setVoiding] = React.useState<PaymentMovement | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const prev = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);
  const diff = summary.total - summary.prevTotal;

  function handleVoid() {
    if (!voiding) return;
    startTransition(async () => {
      const result = await voidPaymentAction({ paymentId: voiding.id });
      if (result.success) toast.success("Pago anulado");
      else toast.error(result.error);
      setVoiding(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Navegación de mes + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/finanzas?m=${prev.month}&y=${prev.year}`} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-[10rem] text-center font-display text-lg font-semibold tracking-tight">
            {monthName(month)} {year}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/finanzas?m=${next.month}&y=${next.year}`} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAmountOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Copago: {formatARS(copagoAmount)}
          </Button>
          <Button onClick={() => setExtraOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar extra
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total cobrado"
          value={formatARS(summary.total)}
          icon={Wallet}
          hint={
            diff === 0
              ? "igual que el mes anterior"
              : `${diff > 0 ? "+" : "−"}${formatARS(Math.abs(diff))} vs mes anterior`
          }
        />
        <StatCard label="Copagos" value={formatARS(summary.totalCopagos)} icon={Receipt} />
        <StatCard label="Extras" value={formatARS(summary.totalExtras)} icon={TrendingUp} />
        <StatCard
          label="Pagos registrados"
          value={summary.paymentCount}
          icon={Users}
          hint={`${summary.payers} ${summary.payers === 1 ? "paciente pagó" : "pacientes pagaron"}`}
        />
      </div>

      {/* Movimientos del mes */}
      <div className="rounded-xl border">
        <div className="border-b px-4 py-3 text-sm font-medium">
          Movimientos de {monthName(month)}
        </div>
        {summary.movements.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title="Sin movimientos"
              description="Todavía no se registraron cobros en este mes."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.patientName ?? "—"}</TableCell>
                    <TableCell>
                      {m.type === "COPAGO" ? (
                        <Badge variant="secondary">
                          Copago{m.quantity > 1 ? ` ×${m.quantity}` : ""}
                        </Badge>
                      ) : (
                        <div className="flex flex-col">
                          <Badge variant="outline" className="w-fit">Extra</Badge>
                          {m.concept && (
                            <span className="mt-0.5 text-xs text-muted-foreground">{m.concept}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {m.paidAt}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatARS(m.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setVoiding(m)}
                        aria-label="Anular pago"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ExtraDialog
        open={extraOpen}
        onOpenChange={setExtraOpen}
        patients={patients}
        todayKey={todayKey}
      />
      <CopagoAmountDialog
        open={amountOpen}
        onOpenChange={setAmountOpen}
        current={copagoAmount}
      />
      <ConfirmDialog
        open={Boolean(voiding)}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Anular pago"
        description={
          voiding
            ? `¿Anular el ${voiding.type === "COPAGO" ? "copago" : "extra"} de ${voiding.patientName ?? "—"} por ${formatARS(voiding.amount)}? Queda registrado como anulado.`
            : ""
        }
        confirmLabel="Anular"
        destructive
        loading={isPending}
        onConfirm={handleVoid}
      />
    </div>
  );
}

// ── Registrar cobro extra ────────────────────────────────────────────────────
function ExtraDialog({
  open,
  onOpenChange,
  patients,
  todayKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: { id: string; name: string }[];
  todayKey: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [userId, setUserId] = React.useState("");
  const [concept, setConcept] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [paidAt, setPaidAt] = React.useState(todayKey);

  React.useEffect(() => {
    if (open) {
      setUserId("");
      setConcept("");
      setAmount(0);
      setPaidAt(todayKey);
    }
  }, [open, todayKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerExtraPaymentAction({
        userId,
        concept,
        amount,
        paidAt,
      });
      if (result.success) {
        toast.success("Cobro extra registrado");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro extra</DialogTitle>
          <DialogDescription>
            Se imputa al mes de la fecha de pago.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extra-concept">Concepto</Label>
            <Input
              id="extra-concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. materiales, sesión extra…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extra-amount">Monto</Label>
              <Input
                id="extra-amount"
                type="number"
                min={1}
                value={Number.isFinite(amount) ? amount : ""}
                onChange={(e) => setAmount(Math.trunc(e.target.valueAsNumber))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-date">Fecha de pago</Label>
              <Input
                id="extra-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <SubmitButton
              loading={isPending}
              loadingText="Registrando…"
              disabled={!userId || !concept.trim() || !(amount >= 1)}
            >
              Registrar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Editar monto del copago ──────────────────────────────────────────────────
function CopagoAmountDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: number;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [amount, setAmount] = React.useState(current);

  React.useEffect(() => {
    if (open) setAmount(current);
  }, [open, current]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCopagoAmountAction({ amount });
      if (result.success) {
        toast.success("Monto del copago actualizado");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Monto del copago</DialogTitle>
          <DialogDescription>
            Es el valor por defecto al registrar copagos. Se puede ajustar en cada pago.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="copago-setting">Monto (ARS)</Label>
            <Input
              id="copago-setting"
              type="number"
              min={0}
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(e) => setAmount(Math.trunc(e.target.valueAsNumber))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <SubmitButton loading={isPending} loadingText="Guardando…" disabled={!(amount >= 0)}>
              Guardar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
