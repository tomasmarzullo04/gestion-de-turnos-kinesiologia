"use client";

import * as React from "react";
import { CalendarPlus, Check, Copy, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  adminBookAction,
  adminCreatePatientAction,
} from "@/app/(admin)/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type SlotView } from "@/server/services/slot.service";

interface Patient {
  id: string;
  name: string;
}

interface Props {
  patients: Patient[];
  services: { id: string; name: string }[];
  todayKey: string;
}

export function CargarTurnoForm({ patients: initialPatients, services, todayKey }: Props) {
  const [patients, setPatients] = React.useState<Patient[]>(initialPatients);
  const [userId, setUserId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [date, setDate] = React.useState(todayKey);
  const [slots, setSlots] = React.useState<SlotView[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [selected, setSelected] = React.useState<SlotView | null>(null);
  const [notes, setNotes] = React.useState("");
  const [confirmOverride, setConfirmOverride] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const fetchSlots = React.useCallback(async (d: string, svc: string) => {
    if (!d || !svc) return;
    setLoadingSlots(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/slots?date=${d}&service=${svc}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { slots: SlotView[] };
      setSlots(data.slots);
    } catch {
      toast.error("No se pudieron cargar las franjas.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  React.useEffect(() => {
    if (serviceId && date) void fetchSlots(date, serviceId);
    else setSlots([]);
  }, [serviceId, date, fetchSlots]);

  function doBook(override: boolean) {
    if (!userId || !selected) return;
    startTransition(async () => {
      const result = await adminBookAction({
        userId,
        slotId: selected.id,
        override,
        notes,
      });
      if (result.success) {
        toast.success(
          result.data.override
            ? "Turno cargado como excepción (sobrecupo)."
            : "Turno cargado.",
        );
        setSelected(null);
        setNotes("");
        void fetchSlots(date, serviceId);
      } else {
        toast.error(result.error);
      }
      setConfirmOverride(false);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return toast.error("Elegí un paciente.");
    if (!selected) return toast.error("Elegí una franja.");
    const full = selected.remaining <= 0;
    if (full) setConfirmOverride(true);
    else doBook(false);
  }

  const canSubmit = Boolean(userId) && Boolean(selected);

  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            <div className="flex gap-2">
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Elegí un paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setNewOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </div>

          {/* Servicio + fecha */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-date">Fecha</Label>
              <Input
                id="ct-date"
                type="date"
                min={todayKey}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Franjas */}
          <div className="space-y-2">
            <Label>Franja</Label>
            {!serviceId ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Elegí un servicio y una fecha para ver las franjas.
              </p>
            ) : loadingSlots ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando franjas…
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No hay franjas para ese día.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => {
                  const full = s.remaining <= 0;
                  const active = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={s.isBlocked || s.isPast}
                      onClick={() => setSelected(s)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                      )}
                    >
                      <span className="font-medium tabular-nums">
                        {s.startTime}–{s.endTime}
                      </span>
                      {full ? (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Lleno ({s.bookedCount}/{s.capacity})
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.remaining} {s.remaining === 1 ? "lugar" : "lugares"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="ct-notes">Notas (opcional)</Label>
            <Textarea id="ct-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <SubmitButton loading={isPending} loadingText="Cargando…" disabled={!canSubmit}>
              <CalendarPlus className="h-4 w-4" />
              {selected && selected.remaining <= 0 ? "Cargar como excepción" : "Cargar turno"}
            </SubmitButton>
          </div>
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirmOverride}
        onOpenChange={(open) => !open && setConfirmOverride(false)}
        title="Franja completa"
        description={
          selected
            ? `La franja ${selected.startTime}–${selected.endTime} está completa (${selected.bookedCount}/${selected.capacity}). ¿Cargar igualmente como excepción (sobrecupo)? Quedará registrado que lo autorizaste vos.`
            : ""
        }
        confirmLabel="Sí, cargar excepción"
        cancelLabel="No"
        loading={isPending}
        onConfirm={() => doBook(true)}
      />

      <NewPatientDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(p) => {
          setPatients((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
          setUserId(p.id);
        }}
      />
    </Card>
  );
}

// ── Alta de paciente nuevo ───────────────────────────────────────────────────
function NewPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (p: Patient) => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [cobertura, setCobertura] = React.useState("PARTICULAR");
  const [obraSocial, setObraSocial] = React.useState("");
  const [requiereCopago, setRequiereCopago] = React.useState(false);
  const [created, setCreated] = React.useState<{ id: string; name: string; email: string; tempPassword: string } | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setCobertura("PARTICULAR");
      setObraSocial("");
      setRequiereCopago(false);
      setCreated(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await adminCreatePatientAction({
        name,
        email,
        phone,
        tipoCoberturaString: cobertura,
        obraSocialNombre: obraSocial,
        requiereCopago,
      });
      if (result.success) {
        setCreated({
          id: result.data.userId,
          name: result.data.name,
          email: result.data.email,
          tempPassword: result.data.tempPassword,
        });
        onCreated({ id: result.data.userId, name: result.data.name });
      } else {
        toast.error(result.error);
      }
    });
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.tempPassword);
      toast.success("Contraseña copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
          <DialogDescription>
            {created
              ? "Cuenta creada. Entregale estos datos al paciente."
              : "Se genera una contraseña temporal que el paciente cambia al ingresar."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{created.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Contraseña temporal</span>
                <span className="flex items-center gap-2">
                  <code className="rounded bg-background px-2 py-1 font-mono text-sm">{created.tempPassword}</code>
                  <Button type="button" variant="ghost" size="icon" onClick={copyPassword}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </span>
              </div>
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
              Compartila por un canal seguro. El paciente deberá cambiarla en su primer ingreso. No
              vas a poder volver a verla.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                <Check className="h-4 w-4" />
                Listo
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np-name">Nombre</Label>
              <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="np-email">Email</Label>
                <Input id="np-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np-phone">Teléfono</Label>
                <Input id="np-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cobertura</Label>
              <Select value={cobertura} onValueChange={setCobertura}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICULAR">Particular</SelectItem>
                  <SelectItem value="OBRA_SOCIAL">Obra Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cobertura === "OBRA_SOCIAL" && (
              <div className="space-y-2">
                <Label htmlFor="np-os">Obra Social / Prepaga</Label>
                <Input id="np-os" value={obraSocial} onChange={(e) => setObraSocial(e.target.value)} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Requiere copago</Label>
              <Switch checked={requiereCopago} onCheckedChange={setRequiereCopago} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <SubmitButton loading={isPending} loadingText="Creando…" disabled={!name.trim() || !email.trim()}>
                Crear cuenta
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
