import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { BrandMark } from "@/components/shared/brand-mark";
import { requirePatient } from "@/lib/auth/session";
import { patientService } from "@/server/services/patient.service";

export const metadata: Metadata = { title: "Bienvenido/a" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requirePatient();

  // Si no necesita onboarding, ya está operativo.
  if (!(await patientService.needsOnboarding(user.id))) {
    redirect("/portal");
  }

  const data = await patientService.getOnboardingData(user.id);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark className="h-10 w-10" animate={false} />
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            ¡Bienvenido/a, {data?.name?.split(" ")[0] ?? ""}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta fue creada por el estudio. Para empezar, definí tu contraseña
            y confirmá tus datos.
          </p>
        </div>
        <OnboardingForm
          defaults={{
            name: data?.name ?? "",
            phone: data?.phone ?? "",
            tipoCoberturaString:
              data?.tipoCoberturaString === "OBRA_SOCIAL" ? "OBRA_SOCIAL" : "PARTICULAR",
            obraSocialNombre: data?.obraSocialNombre ?? "",
          }}
        />
      </div>
    </main>
  );
}
