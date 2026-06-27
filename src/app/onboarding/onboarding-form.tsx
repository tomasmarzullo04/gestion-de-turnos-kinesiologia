"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { completeOnboardingAction } from "@/app/(patient)/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  defaults: {
    name: string;
    phone: string;
    tipoCoberturaString: "OBRA_SOCIAL" | "PARTICULAR";
    obraSocialNombre: string;
  };
}

export function OnboardingForm({ defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(defaults.name);
  const [phone, setPhone] = React.useState(defaults.phone);
  const [cobertura, setCobertura] = React.useState<string>(defaults.tipoCoberturaString);
  const [obraSocial, setObraSocial] = React.useState(defaults.obraSocialNombre);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await completeOnboardingAction({
        name,
        phone,
        tipoCoberturaString: cobertura,
        obraSocialNombre: obraSocial,
        password,
        confirmPassword,
      });
      if (result.success) {
        toast.success("¡Listo! Tu cuenta quedó activa.");
        router.replace("/portal");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ob-name">Nombre completo</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-phone">Teléfono</Label>
            <Input id="ob-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label>Cobertura</Label>
            <Select value={cobertura} onValueChange={setCobertura}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICULAR">Particular</SelectItem>
                <SelectItem value="OBRA_SOCIAL">Obra Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cobertura === "OBRA_SOCIAL" && (
            <div className="space-y-2">
              <Label htmlFor="ob-os">Obra Social / Prepaga</Label>
              <Input id="ob-os" value={obraSocial} onChange={(e) => setObraSocial(e.target.value)} placeholder="OSDE, Swiss Medical..." />
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ob-pass">Nueva contraseña</Label>
              <Input
                id="ob-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-pass2">Repetí la contraseña</Label>
              <Input
                id="ob-pass2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <SubmitButton loading={isPending} loadingText="Guardando…" className="w-full">
            Activar mi cuenta
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
