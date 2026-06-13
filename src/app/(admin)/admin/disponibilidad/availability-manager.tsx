"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAvailabilityAction,
  deleteAvailabilityAction,
} from "@/app/(admin)/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYS_OF_WEEK, dayLabel } from "@/lib/constants";

interface ProfessionalOption {
  id: string;
  name: string;
}

interface AvailabilityDTO {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  professionals: ProfessionalOption[];
  selectedId: string | null;
  availabilities: AvailabilityDTO[];
}

export function AvailabilityManager({
  professionals,
  selectedId,
  availabilities,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [deleting, setDeleting] = React.useState<AvailabilityDTO | null>(null);

  const [dayOfWeek, setDayOfWeek] = React.useState("1");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("13:00");

  function handleProfessionalChange(id: string) {
    router.push(`/admin/disponibilidad?professionalId=${id}`);
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    startTransition(async () => {
      const result = await createAvailabilityAction({
        professionalId: selectedId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });
      if (result.success) {
        toast.success("Franja agregada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteAvailabilityAction(deleting.id);
      if (result.success) {
        toast.success("Franja eliminada");
      } else {
        toast.error(result.error);
      }
      setDeleting(null);
    });
  }

  if (professionals.length === 0) {
    return (
      <EmptyState
        title="No hay profesionales activos"
        description="Creá un profesional antes de configurar su disponibilidad."
      />
    );
  }

  const byDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: availabilities
      .filter((a) => a.dayOfWeek === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div className="space-y-6">
      <div className="max-w-sm space-y-2">
        <Label>Profesional</Label>
        <Select value={selectedId ?? undefined} onValueChange={handleProfessionalChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná un profesional" />
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

      {selectedId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agregar franja horaria</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleAdd}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="space-y-2 sm:w-44">
                  <Label>Día</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
                <SubmitButton loading={isPending} loadingText="Agregando…">
                  <Plus className="h-4 w-4" />
                  Agregar
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDay.map((day) => (
              <Card key={day.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{day.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {day.slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin atención
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {day.slots.map((slot) => (
                        <li
                          key={slot.id}
                          className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
                        >
                          <span className="font-medium tabular-nums">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            onClick={() => setDeleting(slot)}
                            aria-label={`Eliminar franja de ${dayLabel(slot.dayOfWeek)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar franja"
        description={
          deleting
            ? `¿Eliminar la franja de ${dayLabel(deleting.dayOfWeek)} (${deleting.startTime}–${deleting.endTime})?`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
