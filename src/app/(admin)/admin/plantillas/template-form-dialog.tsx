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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateDTO | null;
}

export function TemplateFormDialog({ open, onOpenChange, template }: Props) {
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(template);

  const form = useForm<SlotTemplateInput>({
    resolver: zodResolver(slotTemplateSchema),
    defaultValues: {
      professionalId: null,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "21:00",
      capacity: 20,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        professionalId: null,
        dayOfWeek: template?.dayOfWeek ?? 1,
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
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Día de la semana</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
