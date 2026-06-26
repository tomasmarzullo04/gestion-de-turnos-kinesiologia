"use client";

import * as React from "react";
import { CalendarClock, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { getPatientBookingsAction } from "@/app/(admin)/actions";
import { BookingCard } from "@/components/features/booking-card";
import { CopagoDialog } from "@/components/features/copago-dialog";
import { formatARS } from "@/lib/money";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type MyBooking } from "@/server/services/booking.service";
import { updatePatientAction } from "@/app/(admin)/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/shared/submit-button";

interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  upcoming: number;
  total: number;
  copagoAttended: number;
  copagoPaid: number;
  tipoCoberturaString: string | null;
  obraSocialNombre: string | null;
  requiereCopago: boolean;
  sesionesTotales: number;
  numeroSesionActual: number;
  esPrimeraVez: boolean;
  tratamientoInicio: string | null;
  tratamientoFin: string | null;
}

export function PatientsTable({
  patients,
  copagoAmount,
  todayKey,
}: {
  patients: PatientRow[];
  copagoAmount: number;
  todayKey: string;
}) {
  const [selected, setSelected] = React.useState<PatientRow | null>(null);
  const [copagoFor, setCopagoFor] = React.useState<PatientRow | null>(null);
  const [bookings, setBookings] = React.useState<MyBooking[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Form state para editar paciente
  const [cobertura, setCobertura] = React.useState<string>("PARTICULAR");
  const [obraSocial, setObraSocial] = React.useState("");
  const [copago, setCopago] = React.useState(false);
  const [sesiones, setSesiones] = React.useState(0);
  const [primeraVez, setPrimeraVez] = React.useState(false);

  function openPatient(patient: PatientRow) {
    setSelected(patient);
    setCobertura(patient.tipoCoberturaString ?? "PARTICULAR");
    setObraSocial(patient.obraSocialNombre ?? "");
    setCopago(patient.requiereCopago);
    setSesiones(patient.sesionesTotales);
    setPrimeraVez(patient.esPrimeraVez);
    setBookings([]);
    setLoading(true);
    void getPatientBookingsAction(patient.id).then((result) => {
      if (result.success) setBookings(result.data);
      else toast.error(result.error);
      setLoading(false);
    });
  }

  function handleSavePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      const result = await updatePatientAction(selected.id, {
        tipoCoberturaString: cobertura,
        obraSocialNombre: obraSocial,
        requiereCopago: copago,
        sesionesTotales: sesiones,
        esPrimeraVez: primeraVez,
      });
      if (result.success) {
        toast.success("Datos del paciente actualizados");
        setSelected(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía no hay pacientes"
        description="Cuando se registren pacientes, vas a verlos acá con su historial."
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[1%] whitespace-nowrap">Paciente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="w-full">Cobertura</TableHead>
              <TableHead>Próximos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Copago</TableHead>
              <TableHead className="w-[1%]">Turnos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.esPrimeraVez && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Primera vez</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>{p.email}</div>
                  {p.phone && <div>{p.phone}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {p.tipoCoberturaString === "OBRA_SOCIAL" ? "Obra Social" : "Particular"}
                    </span>
                    {p.obraSocialNombre && (
                      <span className="text-xs text-muted-foreground">{p.obraSocialNombre}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {p.upcoming > 0 ? (
                    <Badge variant="default">{p.upcoming}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">{p.total}</TableCell>
                <TableCell>
                  {(() => {
                    const owed = Math.max(0, p.copagoAttended - p.copagoPaid);
                    return (
                      <button
                        type="button"
                        onClick={() => setCopagoFor(p)}
                        className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Registrar copago"
                      >
                        {owed === 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          >
                            Al día
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 tabular-nums"
                          >
                            Debe {formatARS(owed * copagoAmount)}
                            <span className="ml-1 font-normal opacity-80">
                              ({owed})
                            </span>
                          </Badge>
                        )}
                        <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPatient(p)}
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="turnos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="turnos">Turnos</TabsTrigger>
              <TabsTrigger value="datos">Datos del paciente</TabsTrigger>
            </TabsList>
            
            <TabsContent value="turnos">
              <div className="max-h-[60vh] space-y-3 overflow-y-auto mt-4 p-1">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando turnos…
                  </div>
                ) : bookings.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="Sin turnos"
                    description="Este paciente todavía no reservó turnos."
                  />
                ) : (
                  bookings.map((b) => <BookingCard key={b.id} booking={b} />)
                )}
              </div>
            </TabsContent>

            <TabsContent value="datos">
              <form onSubmit={handleSavePatient} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tipo de Cobertura</Label>
                  <Select value={cobertura} onValueChange={setCobertura}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARTICULAR">Particular</SelectItem>
                      <SelectItem value="OBRA_SOCIAL">Obra Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {cobertura === "OBRA_SOCIAL" && (
                  <div className="space-y-2">
                    <Label>Nombre Obra Social / Prepaga</Label>
                    <Input
                      value={obraSocial}
                      onChange={(e) => setObraSocial(e.target.value)}
                      placeholder="OSDE, Swiss Medical..."
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Requiere copago</Label>
                    <div className="text-sm text-muted-foreground">El paciente debe abonar copago en la recepción</div>
                  </div>
                  <Switch checked={copago} onCheckedChange={setCopago} />
                </div>

                <div className="space-y-2">
                  <Label>Sesiones del tratamiento (Total)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={sesiones}
                    onChange={(e) => setSesiones(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
                  <div className="space-y-0.5">
                    <Label className="text-amber-900 dark:text-amber-200">Primera vez</Label>
                    <div className="text-sm text-amber-700 dark:text-amber-400">Limita los días que puede reservar</div>
                  </div>
                  <Switch checked={primeraVez} onCheckedChange={setPrimeraVez} />
                </div>

                <div className="flex justify-end pt-4">
                  <SubmitButton loading={isPending} loadingText="Guardando...">
                    Guardar cambios
                  </SubmitButton>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CopagoDialog
        open={Boolean(copagoFor)}
        onOpenChange={(open) => !open && setCopagoFor(null)}
        patient={copagoFor}
        copagoAmount={copagoAmount}
        todayKey={todayKey}
      />
    </>
  );
}
