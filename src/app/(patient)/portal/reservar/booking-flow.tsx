"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check } from "lucide-react";
import { toast } from "sonner";

import { bookAppointmentAction } from "@/app/(patient)/actions";
import { SlotPicker } from "@/components/features/slot-picker";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

function StepCard({
  step,
  title,
  complete,
  active,
  children,
}: {
  step: number;
  title: string;
  complete: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-out-soft",
        active ? "opacity-100" : "pointer-events-none opacity-55",
      )}
      aria-disabled={!active}
    >
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200",
              complete
                ? "border-primary bg-primary text-primary-foreground"
                : active
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground",
            )}
          >
            {complete ? <Check className="h-4 w-4" /> : step}
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight">
            {title}
          </h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function BookingFlow({ professionals, services }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [professionalId, setProfessionalId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const step1Complete = Boolean(professionalId && serviceId);
  const step2Complete = Boolean(startsAt);

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
        setStartsAt("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <StepCard step={1} title="Profesional y servicio" complete={step1Complete} active>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </StepCard>

      <StepCard
        step={2}
        title="Fecha y horario"
        complete={step2Complete}
        active={step1Complete}
      >
        <SlotPicker
          professionalId={professionalId || undefined}
          serviceId={serviceId || undefined}
          value={startsAt}
          onChange={setStartsAt}
        />
      </StepCard>

      <StepCard
        step={3}
        title="Confirmar"
        complete={false}
        active={step2Complete}
      >
        <div className="space-y-4">
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
              size="lg"
              loading={isPending}
              loadingText="Reservando…"
              onClick={handleConfirm}
              disabled={!startsAt}
            >
              <CalendarCheck className="h-4 w-4" />
              Confirmar turno
            </SubmitButton>
          </div>
        </div>
      </StepCard>
    </div>
  );
}
