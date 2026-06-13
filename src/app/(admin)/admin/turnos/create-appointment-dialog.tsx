"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createAppointmentAction } from "@/app/(admin)/actions";
import { SlotPicker } from "@/components/features/slot-picker";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Option {
  id: string;
  name: string;
}
interface ServiceOption extends Option {
  durationMinutes: number;
}

interface Props {
  patients: Option[];
  professionals: Option[];
  services: ServiceOption[];
}

export function CreateAppointmentDialog({
  patients,
  professionals,
  services,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [patientId, setPatientId] = React.useState("");
  const [professionalId, setProfessionalId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function reset() {
    setPatientId("");
    setProfessionalId("");
    setServiceId("");
    setStartsAt("");
    setNotes("");
  }

  function handleSubmit() {
    if (!patientId || !professionalId || !serviceId || !startsAt) {
      toast.error("Completá paciente, profesional, servicio y horario.");
      return;
    }
    startTransition(async () => {
      const result = await createAppointmentAction({
        patientId,
        professionalId,
        serviceId,
        startsAt,
        notes,
      });
      if (result.success) {
        toast.success("Turno creado y confirmado");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo turno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>
            Creá un turno manualmente. Quedará confirmado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí" />
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
              <Label>Profesional</Label>
              <Select
                value={professionalId}
                onValueChange={(v) => {
                  setProfessionalId(v);
                  setStartsAt("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select
                value={serviceId}
                onValueChange={(v) => {
                  setServiceId(v);
                  setStartsAt("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes}′)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Horario</Label>
            <SlotPicker
              professionalId={professionalId || undefined}
              serviceId={serviceId || undefined}
              value={startsAt}
              onChange={setStartsAt}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <SubmitButton
              loading={isPending}
              loadingText="Creando…"
              onClick={handleSubmit}
              type="button"
            >
              Crear turno
            </SubmitButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
