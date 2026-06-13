import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireAdmin } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <DashboardShell
      role={ROLES.ADMIN}
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </DashboardShell>
  );
}
