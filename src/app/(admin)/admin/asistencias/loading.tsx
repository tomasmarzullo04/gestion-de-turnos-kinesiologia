import { PageHeader } from "@/components/shared/page-header";

export default function AsistenciasLoading() {
  return (
    <div>
      <PageHeader
        title="Asistencias"
        description="Marcá quién asistió en cada franja. El listado sale de las reservas."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-48 bg-card border border-border/40 rounded-xl" />
          <div className="h-10 w-24 bg-muted/50 rounded-xl" />
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-xl" />
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted/60 rounded" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-24 bg-muted rounded-full" />
                <div className="h-10 w-24 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
