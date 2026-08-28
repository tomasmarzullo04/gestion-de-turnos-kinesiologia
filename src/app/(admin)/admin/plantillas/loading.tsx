import { PageHeader } from "@/components/shared/page-header";

export default function PlantillasLoading() {
  return (
    <div>
      <PageHeader
        title="Plantillas de servicios"
        description="Configurá los horarios fijos de atención."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-48 bg-card border border-border/40 rounded-xl" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4 border-b border-border/20 pb-4">
                <div className="h-12 w-12 bg-muted rounded-full" />
                <div className="h-5 w-32 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-4 w-32 bg-muted/60 rounded" />
                <div className="h-4 w-28 bg-muted/60 rounded" />
              </div>
              <div className="h-10 w-full bg-muted/50 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
