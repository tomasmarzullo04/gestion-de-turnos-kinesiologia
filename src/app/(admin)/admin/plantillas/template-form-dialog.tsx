"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import {
  createTemplateAction,
  updateTemplateGroupAction,
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

export interface TemplateGroupDTO {
  dayOfWeek: number;
  serviceId: string | null;
  active: boolean;
  ranges: {
    startTime: string;
    endTime: string;
    capacity: number;
  }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TemplateGroupDTO | null;
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
      ranges: [{ startTime: "08:00", endTime: "21:00", capacity: 20 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ranges",
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        professionalId: null,
        serviceId: template?.serviceId ?? null,
        daysOfWeek: template ? [template.dayOfWeek] : [1],
        ranges: template?.ranges?.length 
          ? template.ranges 
          : [{ startTime: "08:00", endTime: "21:00", capacity: 20 }],
      });
    }
  }, [open, template, form]);

  function onSubmit(values: SlotTemplateInput) {
    startTransition(async () => {
      const result = template
        ? await updateTemplateGroupAction(template.dayOfWeek, template.serviceId, values)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar plantilla" : "Nueva plantilla"}
          </DialogTitle>
          <DialogDescription>
            Definí el día, la franja horaria y la capacidad. Podés agregar múltiples franjas por día.
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
                        if (s) {
                           // Set the capacity of the first range to the service's capacity
                           const currentRanges = form.getValues("ranges");
                           if (currentRanges.length > 0) {
                             form.setValue(`ranges.0.capacity`, s.capacity);
                           }
                        }
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
            
            <div className="space-y-4 pt-2">
              <FormLabel>Franjas Horarias</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md space-y-4 relative bg-muted/20">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`ranges.${index}.startTime`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Desde</FormLabel>
                          <FormControl>
                            <Input type="time" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${index}.endTime`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Hasta</FormLabel>
                          <FormControl>
                            <Input type="time" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`ranges.${index}.capacity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Capacidad por hora</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            {...f}
                            onChange={(e) =>
                              f.onChange(e.target.valueAsNumber || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-2 border-dashed"
                onClick={() => append({ startTime: "08:00", endTime: "12:00", capacity: 20 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar franja horaria
              </Button>

              {form.formState.errors.ranges?.root && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.ranges.root.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
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
