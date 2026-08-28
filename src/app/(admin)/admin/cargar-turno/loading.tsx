import { PageHeader } from "@/components/shared/page-header";

export default function CargarTurnoLoading() {
  return (
    <div>
      <PageHeader
        title="Cargar turno manual"
        description="Agendá o agregá sobrecupos a nombre de un paciente."
      />
      <div className="space-y-4 mt-6 animate-pulse">
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-48 bg-card border border-border/40 rounded-xl" />
          <div className="h-10 w-24 bg-muted/50 rounded-xl" />
        </div>
        
        <div className="rounded-[2rem] border border-border/40 bg-card p-6 sm:p-10 h-[500px] flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md">
            <div className="h-5 w-48 bg-muted rounded mx-auto" />
            <div className="h-12 w-full bg-muted/60 rounded-xl" />
            <div className="h-12 w-full bg-muted/60 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
