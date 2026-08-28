import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export default function ReservarLoading() {
  return (
    <div>
      <PageHeader
        title="Reservar turno"
        description="Reservá un turno único o un turno fijo recurrente."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-card border border-border/40 rounded-xl" />
          <div className="h-10 w-32 bg-muted/50 rounded-xl" />
        </div>
        
        <div className="rounded-[2rem] border border-border/40 bg-card p-6 sm:p-10 h-[500px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">Cargando disponibilidad...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
