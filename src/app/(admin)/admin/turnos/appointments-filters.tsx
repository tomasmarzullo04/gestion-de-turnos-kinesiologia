"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VALUES,
} from "@/lib/constants";

interface Props {
  professionals: { id: string; name: string }[];
}

const ALL = "ALL";

export function AppointmentsFilters({ professionals }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patient, setPatient] = React.useState(
    searchParams.get("patient") ?? "",
  );

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/admin/turnos?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Debounce de la búsqueda por paciente.
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if ((searchParams.get("patient") ?? "") !== patient) {
        setParam("patient", patient || null);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [patient, searchParams, setParam]);

  const hasFilters =
    Boolean(searchParams.get("professionalId")) ||
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to")) ||
    Boolean(searchParams.get("patient"));

  function clearAll() {
    setPatient("");
    router.replace("/admin/turnos");
  }

  return (
    <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label className="text-xs">Profesional</Label>
        <Select
          value={searchParams.get("professionalId") ?? ALL}
          onValueChange={(v) => setParam("professionalId", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Estado</Label>
        <Select
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => setParam("status", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {APPOINTMENT_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {APPOINTMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Desde</Label>
        <Input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Hasta</Label>
        <Input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Paciente</Label>
        <Input
          placeholder="Nombre o email"
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
        />
      </div>

      {hasFilters && (
        <div className="flex items-end lg:col-span-5">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
