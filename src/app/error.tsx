"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción esto se enviaría a un servicio de tracking.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado. Podés reintentar; si el problema
          persiste, volvé a intentarlo más tarde.
        </p>
      </div>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
