import { PageHeader } from "@/components/shared/page-header";

export default function PacientesLoading() {
  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Listado de socios, historial y coberturas."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-full max-w-sm bg-card border border-border/40 rounded-full" />
          <div className="h-10 w-32 bg-muted/50 rounded-full" />
        </div>
        
        <div className="rounded-[2rem] border border-border/40 bg-card overflow-hidden">
          <div className="h-14 bg-muted/30 border-b border-border/40" />
          <div className="divide-y divide-border/20">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted/60 rounded" />
                  </div>
                </div>
                <div className="hidden sm:block space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted/60 rounded" />
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
