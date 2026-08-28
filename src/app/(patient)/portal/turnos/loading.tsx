import { PageHeader } from "@/components/shared/page-header";

export default function TurnosLoading() {
  return (
    <div>
      <PageHeader
        title="Mis turnos"
        description="Tus próximos turnos y tu historial."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-24 bg-card border border-border/40 rounded-xl" />
          <div className="h-10 w-24 bg-muted/50 rounded-xl" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted/60 rounded" />
              </div>
              <div className="h-10 w-24 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
