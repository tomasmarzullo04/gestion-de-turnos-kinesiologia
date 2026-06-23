"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createTemplateAction,
  updateTemplateAction,
} from "@/app/(admin)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYS_OF_WEEK } from "@/lib/constants";
import {
  slotTemplateSchema,
  type SlotTemplateInput,
} from "@/lib/validations/slot-template";

export interface TemplateDTO {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  serviceId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateDTO | null;
  services: { id: string; name: string; capacity: number }[];
}

export function TemplateFormDialog({ open, onOpenChange, template, services }: Props) {
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(template);

  const form = useForm<SlotTemplateInput>({
    resolver: zodResolver(slotTemplateSchema),
    defaultValues: {
      professionalId: null,
      serviceId: null,
      daysOfWeek: [1],
      startTime: "08:00",
      endTime: "21:00",
      capacity: 20,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        professionalId: null,
        serviceId: template?.serviceId ?? null,
        daysOfWeek: template ? [template.dayOfWeek] : [1],
        startTime: template?.startTime ?? "08:00",
        endTime: template?.endTime ?? "21:00",
        capacity: template?.capacity ?? 20,
      });
    }
  }, [open, template, form]);

  function onSubmit(values: SlotTemplateInput) {
    startTransition(async () => {
      const result = template
        ? await updateTemplateAction(template.id, values)
        : await createTemplateAction(values);
      if (result.success) {
        toast.success(isEditing ? "Plantilla actualizada" : "Plantilla creada");
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
          <DialogTitle>
            {isEditing ? "Editar plantilla" : "Nueva plantilla"}
          </DialogTitle>
          <DialogDescription>
            Definí el día, la ventana horaria y la capacidad. La agenda se divide
            en bloques de 1 hora.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => {
                      const val = v === "none" ? null : v;
                      field.onChange(val);
                      if (val && !isEditing) {
                        const s = services.find((srv) => srv.id === val);
                        if (s) form.setValue("capacity", s.capacity);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un servicio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguno (General)</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="daysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de la semana</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = field.value?.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => {
                              const curr = field.value || [];
                              const next = isSelected
                                ? curr.filter(v => v !== d.value)
                                : [...curr, d.value];
                              field.onChange(next);
                            }}
                            className={cn(
                              "flex h-9 min-w-[3rem] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-foreground hover:bg-muted"
                            )}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidad por franja</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Cupos disponibles en cada bloque de 1 hora.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <SubmitButton loading={isPending} loadingText="Guardando…">
                {isEditing ? "Guardar cambios" : "Crear plantilla"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
