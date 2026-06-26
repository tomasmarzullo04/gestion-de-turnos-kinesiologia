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
import { formatARS } from "@/lib/money";

export interface CopagoPatient {
  id: string;
  name: string;
  copagoAttended: number;
  copagoPaid: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: CopagoPatient | null;
  copagoAmount: number;
  todayKey: string;
}

export function CopagoDialog({
  open,
  onOpenChange,
  patient,
  copagoAmount,
  todayKey,
}: Props) {
  const [isPending, startTransition] = React.useTransition();
  const [quantity, setQuantity] = React.useState(1);
  const [unitAmount, setUnitAmount] = React.useState(copagoAmount);
  const [paidAt, setPaidAt] = React.useState(todayKey);

  const attended = patient?.copagoAttended ?? 0;
  const paid = patient?.copagoPaid ?? 0;
  const owed = Math.max(0, attended - paid);

  // Al abrir: precargar la deuda completa (mín. 1) y el monto vigente.
  React.useEffect(() => {
    if (open) {
      setQuantity(Math.max(1, owed));
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

  const qty = Number.isFinite(quantity) ? quantity : 0;
  const unit = Number.isFinite(unitAmount) ? unitAmount : 0;
  const total = qty * unit;
  const remainingAfter = Math.max(0, owed - qty);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar copago</DialogTitle>
          <DialogDescription>{patient?.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumen claro de la deuda */}
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asistió a</span>
              <span className="font-medium tabular-nums">{attended} sesiones</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagó</span>
              <span className="font-medium tabular-nums">{paid} copagos</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1">
              <span className="font-medium">Debe</span>
              <span className="font-semibold tabular-nums">
                {owed} {owed === 1 ? "copago" : "copagos"} ={" "}
                {formatARS(owed * copagoAmount)}
              </span>
            </div>
          </div>

          {owed === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Este paciente está al día. No tiene copagos pendientes.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="copago-qty">Copagos a pagar</Label>
                  <Input
                    id="copago-qty"
                    type="number"
                    min={1}
                    max={owed}
                    value={Number.isFinite(quantity) ? quantity : ""}
                    onChange={(e) =>
                      setQuantity(
                        Math.min(owed, Math.max(1, Math.trunc(e.target.valueAsNumber))),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setQuantity(owed)}
                  >
                    Saldar todo ({owed})
                  </button>
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
                <div className="text-sm">
                  <div className="font-medium">Total a cobrar</div>
                  <div className="text-xs text-muted-foreground">
                    Queda debiendo {remainingAfter}{" "}
                    {remainingAfter === 1 ? "copago" : "copagos"}
                  </div>
                </div>
                <span className="text-lg font-semibold tabular-nums">
                  {formatARS(total)}
                </span>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {owed === 0 ? "Cerrar" : "Cancelar"}
            </Button>
            {owed > 0 && (
              <SubmitButton
                loading={isPending}
                loadingText="Registrando…"
                disabled={!(qty >= 1) || qty > owed || !(unit >= 0)}
              >
                Registrar
              </SubmitButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
