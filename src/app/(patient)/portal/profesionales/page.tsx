import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Stethoscope } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePatient } from "@/lib/auth/session";
import { getInitials } from "@/lib/utils";
import { professionalService } from "@/server/services/professional.service";

export const metadata: Metadata = { title: "Profesionales" };
export const dynamic = "force-dynamic";

export default async function ProfessionalsPage() {
  await requirePatient();
  const professionals = await professionalService.listActive();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuestro equipo"
        description="El equipo de Apex que te acompaña en cada entrenamiento."
      >
        <Button asChild>
          <Link href="/portal/reservar">
            <CalendarPlus className="h-4 w-4" />
            Reservar turno
          </Link>
        </Button>
      </PageHeader>

      {professionals.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aún no hay profesionales publicados"
          description="Pronto vas a poder conocer a nuestro equipo."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {professionals.map((p) => (
            <Card key={p.id} interactive>
              <CardContent className="flex items-center gap-4 p-5">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(p.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {p.specialty ?? "Entrenamiento"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
