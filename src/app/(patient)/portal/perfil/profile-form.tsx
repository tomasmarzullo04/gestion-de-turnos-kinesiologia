"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/(patient)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
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
import { Label } from "@/components/ui/label";
import { profileSchema, type ProfileInput } from "@/lib/validations/auth";

interface Props {
  email: string;
  defaultValues: { name: string; phone: string };
}

export function ProfileForm({ email, defaultValues }: Props) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  function onSubmit(values: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.success) {
        toast.success("Perfil actualizado");
      } else {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              form.setError(field as keyof ProfileInput, {
                message: messages[0],
              });
            }
          }
        }
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-lg space-y-4"
      >
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            El email no se puede modificar.
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} />
              </FormControl>
              <FormDescription>Opcional, para recordatorios.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton loading={isPending} loadingText="Guardando…">
          Guardar cambios
        </SubmitButton>
      </form>
    </Form>
  );
}
