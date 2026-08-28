import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLoading() {
  return (
    <div className="space-y-6 stagger-children">
      <PageHeader title="Dashboard" description="Resumen y métricas del estudio.">
        <Button asChild disabled>
          <span>Asistencias</span>
        </Button>
      </PageHeader>

      {/* KPIs Principales de Hoy Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm animate-pulse">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded-full" />
            </div>
            <div>
              <div className="h-8 w-16 bg-muted/60 rounded mt-2" />
              <div className="h-3 w-32 bg-muted rounded mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos Skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[350px] rounded-2xl border border-border/50 bg-card/30 animate-pulse" />
        <div className="h-[350px] rounded-2xl border border-border/50 bg-card/30 animate-pulse" />
      </div>

      {/* Horarios Pico Skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-border/50 bg-card/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
