import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/app/(patient)/portal/perfil/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { requirePatient } from "@/lib/auth/session";
import { userRepository } from "@/server/repositories/user.repository";

export const metadata: Metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requirePatient();
  const user = await userRepository.findById(sessionUser.id);

  return (
    <div>
      <PageHeader
        title="Mi perfil"
        description="Actualizá tus datos de contacto."
      />
      <Card>
        <CardContent className="pt-6">
          <ProfileForm
            email={sessionUser.email}
            defaultValues={{
              name: user?.name ?? sessionUser.name,
              phone: user?.phone ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
