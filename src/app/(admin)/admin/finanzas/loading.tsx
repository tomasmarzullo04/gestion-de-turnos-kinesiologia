import { PageHeader } from "@/components/shared/page-header";

export default function FinanzasLoading() {
  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Gestión de copagos, membresías e ingresos varios."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        {/* KPI Skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded-full" />
              </div>
              <div>
                <div className="h-8 w-16 bg-muted/60 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Tabla Skeleton */}
        <div className="rounded-[2rem] border border-border/40 bg-card overflow-hidden">
          <div className="h-16 bg-muted/30 border-b border-border/40 flex items-center px-6">
            <div className="h-6 w-32 bg-muted rounded" />
          </div>
          <div className="divide-y divide-border/20">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted/60 rounded" />
                  </div>
                </div>
                <div className="hidden sm:block space-y-2">
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
