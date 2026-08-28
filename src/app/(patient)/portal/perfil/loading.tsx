import { PageHeader } from "@/components/shared/page-header";

export default function PerfilLoading() {
  return (
    <div>
      <PageHeader
        title="Mi perfil"
        description="Actualizá tus datos personales y de contacto."
      />
      <div className="mt-6">
        <div className="rounded-[2rem] border border-border/40 bg-card p-6 sm:p-8 space-y-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-10 w-full bg-muted rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-10 w-full bg-muted rounded-xl" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-border/20">
            <div className="h-6 w-40 bg-muted rounded" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-10 w-full bg-muted rounded-xl" />
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <div className="h-10 w-32 bg-primary/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
