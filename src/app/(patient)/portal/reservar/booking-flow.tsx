"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";

import { bookAppointmentAction } from "@/app/(patient)/actions";
import { SlotPicker } from "@/components/features/slot-picker";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  specialty?: string | null;
}
interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  description?: string | null;
}

interface Props {
  professionals: Option[];
  services: ServiceOption[];
}

export function BookingFlow({ professionals, services }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [professionalId, setProfessionalId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function handleConfirm() {
    if (!professionalId || !serviceId || !startsAt) {
      toast.error("Elegí profesional, servicio y horario.");
      return;
    }
    startTransition(async () => {
      const result = await bookAppointmentAction({
        professionalId,
        serviceId,
        startsAt,
        notes,
      });
      if (result.success) {
        toast.success("¡Turno reservado! Queda pendiente de confirmación.");
        router.push("/portal/turnos");
      } else {
        toast.error(result.error);
        // Si el horario fue tomado mientras tanto, limpiamos la selección.
        setStartsAt("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Profesional y servicio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
                <SelectValue placeholder="Elegí un profesional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.specialty ? ` · ${p.specialty}` : ""}
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
                <SelectValue placeholder="Elegí un servicio" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Fecha y horario</CardTitle>
        </CardHeader>
        <CardContent>
          <SlotPicker
            professionalId={professionalId || undefined}
            serviceId={serviceId || undefined}
            value={startsAt}
            onChange={setStartsAt}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3 · Confirmar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notas para el profesional</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de consulta, lesión, etc. (opcional)"
            />
          </div>
          <div className="flex justify-end">
            <SubmitButton
              type="button"
              loading={isPending}
              loadingText="Reservando…"
              onClick={handleConfirm}
              disabled={!startsAt}
            >
              <CalendarCheck className="h-4 w-4" />
              Confirmar turno
            </SubmitButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
