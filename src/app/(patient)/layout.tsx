import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requirePatient } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { patientService } from "@/server/services/patient.service";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePatient();

  // Onboarding obligatorio: si la cuenta la creó el profesional y el paciente
  // todavía no cambió su contraseña, no puede operar hasta completarlo.
  if (await patientService.needsOnboarding(user.id)) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell
      role={ROLES.PATIENT}
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </DashboardShell>
  );
}
