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
import { Switch } from "@/components/ui/switch";
import {
  professionalSchema,
  type ProfessionalInput,
} from "@/lib/validations/professional";

export interface ProfessionalDTO {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: ProfessionalDTO | null;
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  professional,
}: Props) {
  const [isPending, startTransition] = React.useTransition();
  const isEditing = Boolean(professional);

  const form = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { name: "", specialty: "", active: true },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: professional?.name ?? "",
        specialty: professional?.specialty ?? "",
        active: professional?.active ?? true,
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
