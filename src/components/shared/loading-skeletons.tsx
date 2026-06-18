import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton de encabezado de página. */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Grilla de tarjetas de métricas. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Lista de filas (tabla/cards). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** Dashboard del paciente skeleton. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatsSkeleton count={3} />
      <div className="grid gap-6 md:grid-cols-7">
        <div className="flex flex-col gap-6 md:col-span-4 lg:col-span-5">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
        <div className="md:col-span-3 lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton para el flujo de reserva de turnos. */
export function BookingFlowSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeaderSkeleton />
      
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        
        <Skeleton className="h-6 w-48 mt-8" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
