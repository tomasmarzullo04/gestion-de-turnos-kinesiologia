"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createServiceAction,
  updateServiceAction,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { serviceSchema, type ServiceInput } from "@/lib/validations/service";

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  active: boolean;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceDTO | null;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(service);

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: 45,
      active: true,
    },
  });

  // Sincronizar valores al abrir / cambiar de servicio.
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        durationMinutes: service?.durationMinutes ?? 45,
        active: service?.active ?? true,
      });
    }
  }, [open, service, form]);

  function onSubmit(values: ServiceInput) {
    startTransition(async () => {
      const result = service
        ? await updateServiceAction(service.id, values)
        : await createServiceAction(values);

      if (result.success) {
        toast.success(isEditing ? "Servicio actualizado" : "Servicio creado");
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
            {isEditing ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
          <DialogDescription>
            La duración define cuánto ocupa el turno en la agenda.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sesión RPG" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle del servicio (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Activo</FormLabel>
                    <FormDescription>
                      Solo los servicios activos pueden reservarse.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {isEditing ? "Guardar cambios" : "Crear servicio"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
