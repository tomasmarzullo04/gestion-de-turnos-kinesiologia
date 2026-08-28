import { Loader2 } from "lucide-react";

export default function PortalLoading() {
  return (
    <div className="space-y-6 md:space-y-8 stagger-children pb-10">
      {/* 1. Bloque principal de bienvenida */}
      <section className="rounded-[2rem] bg-card shadow-lg overflow-hidden flex flex-col border border-border/40 animate-pulse">
        <div className="relative px-6 py-10 sm:px-12 sm:py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="relative z-10 space-y-4">
            <div className="h-10 w-64 bg-muted rounded-xl" />
            <div className="h-6 w-96 max-w-full bg-muted/60 rounded-xl" />
          </div>
          <div className="h-12 w-full sm:w-48 bg-muted rounded-full relative z-10" />
        </div>
        
        {/* Métricas integradas */}
        <div className="relative z-10 bg-muted/10 border-t border-border/40 p-4 sm:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:pr-6">
              <div className="rounded-full bg-muted p-5 h-11 w-11" />
              <div className="space-y-2">
                 <div className="h-4 w-24 bg-muted rounded" />
                 <div className="h-6 w-32 bg-muted/60 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:px-6">
              <div className="rounded-full bg-muted p-5 h-11 w-11" />
              <div className="space-y-2">
                 <div className="h-4 w-24 bg-muted rounded" />
                 <div className="h-6 w-16 bg-muted/60 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4 py-3 sm:py-0 sm:pl-6">
              <div className="rounded-full bg-muted p-5 h-11 w-11" />
              <div className="space-y-2">
                 <div className="h-4 w-24 bg-muted rounded" />
                 <div className="h-6 w-16 bg-muted/60 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Zona principal: próximo turno y ubicación */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximo turno Skeleton */}
        <div className="rounded-[2rem] border border-border/40 shadow-sm bg-card h-[250px] flex items-center justify-center animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
        </div>
        {/* Mapa Skeleton */}
        <div className="rounded-[2rem] border border-border/40 shadow-sm bg-card h-[250px] animate-pulse" />
      </div>

      {/* 3. Acciones rápidas Skeleton */}
      <section>
        <div className="h-6 w-40 bg-muted rounded mb-4 ml-2 animate-pulse" />
        <div className="rounded-[2rem] border border-border/40 shadow-sm bg-card animate-pulse">
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="h-14 w-14 rounded-2xl bg-muted" />
                <div>
                  <div className="h-5 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-48 bg-muted/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
