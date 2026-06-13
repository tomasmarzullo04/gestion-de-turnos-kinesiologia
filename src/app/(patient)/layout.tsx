import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requirePatient } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePatient();

  return (
    <DashboardShell
      role={ROLES.PATIENT}
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </DashboardShell>
  );
}
