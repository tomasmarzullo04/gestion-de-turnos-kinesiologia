"use client";

import * as React from "react";
import { toast } from "sonner";

import { registerCopagoAction } from "@/app/(admin)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
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
import { formatARS, monthName } from "@/lib/money";

export interface CopagoPatient {
  id: string;
  name: string;
  copagoPaid: number;
  copagoExpected: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: CopagoPatient | null;
  copagoAmount: number;
  period: { month: number; year: number };
  todayKey: string;
}

export function CopagoDialog({
  open,
  onOpenChange,
  patient,
  copagoAmount,
  period,
  todayKey,
}: Props) {
  const [isPending, startTransition] = React.useTransition();
  const [quantity, setQuantity] = React.useState(1);
  const [unitAmount, setUnitAmount] = React.useState(copagoAmount);
  const [paidAt, setPaidAt] = React.useState(todayKey);

  const remaining = patient
    ? Math.max(0, patient.copagoExpected - patient.copagoPaid)
    : 0;

  // Al abrir, precargar cantidad pendiente (mín. 1) y el monto vigente.
  React.useEffect(() => {
    if (open) {
      setQuantity(Math.max(1, remaining));
      setUnitAmount(copagoAmount);
      setPaidAt(todayKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;
    startTransition(async () => {
      const result = await registerCopagoAction({
        userId: patient.id,
        quantity,
        unitAmount,
        periodMonth: period.month,
        periodYear: period.year,
        paidAt,
      });
      if (result.success) {
        toast.success(
          quantity === 1 ? "Copago registrado" : `${quantity} copagos registrados`,
        );
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const total = (Number.isFinite(quantity) ? quantity : 0) *
    (Number.isFinite(unitAmount) ? unitAmount : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar copago</DialogTitle>
          <DialogDescription>
            {patient?.name} · {monthName(period.month)} {period.year}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turnos del mes</span>
              <span className="font-medium tabular-nums">
                {patient?.copagoExpected ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Copagos pagados</span>
              <span className="font-medium tabular-nums">
                {patient?.copagoPaid ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pendientes</span>
              <span className="font-medium tabular-nums">{remaining}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="copago-qty">Cantidad de copagos</Label>
              <Input
                id="copago-qty"
                type="number"
                min={1}
                max={60}
                value={Number.isFinite(quantity) ? quantity : ""}
                onChange={(e) => setQuantity(Math.trunc(e.target.valueAsNumber))}
              />
              {remaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  Podés saldar el mes: {remaining} pendiente{remaining === 1 ? "" : "s"}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="copago-amount">Monto por copago</Label>
              <Input
                id="copago-amount"
                type="number"
                min={0}
                value={Number.isFinite(unitAmount) ? unitAmount : ""}
                onChange={(e) => setUnitAmount(Math.trunc(e.target.valueAsNumber))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copago-date">Fecha de pago</Label>
            <Input
              id="copago-date"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Total a registrar</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatARS(total)}
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <SubmitButton
              loading={isPending}
              loadingText="Registrando…"
              disabled={!(quantity >= 1) || !(unitAmount >= 0)}
            >
              Registrar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
