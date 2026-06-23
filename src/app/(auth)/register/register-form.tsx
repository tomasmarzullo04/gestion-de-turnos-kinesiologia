"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { registerAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { PasswordInput } from "@/components/shared/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      tipoCobertura: "PARTICULAR",
      obraSocialNombre: "",
      requiereCopago: false,
      montoCopago: undefined,
      esPrimeraVez: true,
    },
  });

  const watchCobertura = form.watch("tipoCobertura");
  const watchCopago = form.watch("requiereCopago");

  function onSubmit(values: RegisterInput) {
    startTransition(async () => {
      const result = await registerAction(values);
      if (result && !result.success) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              form.setError(field as keyof RegisterInput, {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Datos Personales */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Juan Pérez" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="tu@email.com" {...field} />
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
                    <Input type="tel" autoComplete="tel" placeholder="+54 11 1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="h-px bg-border my-4" />

        {/* Cobertura y Primera Vez */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="tipoCobertura"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Cobertura</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná tu cobertura" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PARTICULAR">Particular</SelectItem>
                    <SelectItem value="OBRA_SOCIAL">Obra Social / Prepaga</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div
            className={cn(
              "grid grid-cols-1 gap-4 transition-all duration-300 ease-in-out overflow-hidden",
              watchCobertura === "OBRA_SOCIAL" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="min-h-0 space-y-4">
              <FormField
                control={form.control}
                name="obraSocialNombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Obra Social</FormLabel>
                    <FormControl>
                      <Input placeholder="OSDE, Swiss Medical, etc." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="requiereCopago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Requiere copago?</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "yes")}
                        defaultValue={field.value ? "yes" : "no"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccioná" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Sí</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    watchCopago ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <FormField
                    control={form.control}
                    name="montoCopago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto de Copago</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ingresar monto manual"
                            min={0}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="esPrimeraVez"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-primary/5 transition-colors">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-semibold text-primary">Es mi primera vez en el estudio</FormLabel>
                  <FormDescription>
                    Tildá esta opción si sos paciente nuevo. Nos ayuda a prepararnos mejor para tu primera visita.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="h-px bg-border my-4" />

        {/* Seguridad */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="Mínimo 8 caracteres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" placeholder="Repetí la contraseña" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <SubmitButton loading={isPending} loadingText="Creando cuenta…" className="w-full mt-6">
          Crear cuenta
        </SubmitButton>
      </form>
    </Form>
  );
}
