"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      // Respuesta genérica: mostramos el mismo mensaje exista o no la cuenta.
      if (result.success) setSent(true);
      else toast.error(result.error);
    });
  }

  if (sent) {
    return (
      <div className="space-y-3 py-2 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">
          Si el email existe, te enviamos un enlace para restablecer tu contraseña.
          Revisá tu casilla (y la carpeta de spam). El enlace vence en 1 hora.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton loading={isPending} loadingText="Enviando…" className="w-full">
          Enviar enlace
        </SubmitButton>
      </form>
    </Form>
  );
}
