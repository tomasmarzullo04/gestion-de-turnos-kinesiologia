"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createProfessionalAction,
  updateProfessionalAction,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  professionalSchema,
  type ProfessionalInput,
} from "@/lib/validations/professional";

import { type ProfessionalDTO } from "@/app/(admin)/admin/profesionales/professionals-manager";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: ProfessionalDTO | null;
  services: { id: string; name: string }[];
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  professional,
  services,
}: Props) {
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(professional);

  const form = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { name: "", specialty: "", active: true, serviceIds: [] },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: professional?.name ?? "",
        specialty: professional?.specialty ?? "",
        active: professional?.active ?? true,
        serviceIds: professional?.serviceIds ?? [],
      });
    }
  }, [open, professional, form]);

  function onSubmit(values: ProfessionalInput) {
    startTransition(async () => {
      const result = professional
        ? await updateProfessionalAction(professional.id, values)
        : await createProfessionalAction(values);
      if (result.success) {
        toast.success(
          isEditing ? "Profesional actualizado" : "Profesional creado",
        );
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
            {isEditing ? "Editar profesional" : "Nuevo profesional"}
          </DialogTitle>
          <DialogDescription>
            Datos del profesional que se muestran a los pacientes.
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
                    <Input placeholder="Nombre del entrenador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrenamiento" {...field} />
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
                      Los profesionales activos se muestran en el portal.
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
            <FormField
              control={form.control}
              name="serviceIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Servicios habilitados</FormLabel>
                    <FormDescription>
                      Seleccioná los servicios que este profesional puede brindar.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {services.map((service) => (
                      <FormField
                        key={service.id}
                        control={form.control}
                        name="serviceIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={service.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(service.id)}
                                  onCheckedChange={(checked: boolean | "indeterminate") => {
                                    return checked === true
                                      ? field.onChange([...(field.value || []), service.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== service.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {service.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
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
                {isEditing ? "Guardar cambios" : "Crear profesional"}
              </SubmitButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
