"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  deletePatientAction,
  getPatientBookingsAction,
  getPatientDeletionImpactAction,
  reactivatePatientAction,
  updatePatientAction,
} from "@/app/(admin)/actions";
import { BookingCard } from "@/components/features/booking-card";
import { CopagoDialog } from "@/components/features/copago-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatARS } from "@/lib/money";
import { type MyBooking } from "@/server/services/booking.service";

interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  archived: boolean;
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

interface Impact {
  bookings: number;
  futureBookings: number;
  attendances: number;
  payments: number;
  hasHistory: boolean;
}

export function PatientsTable({
  patients,
  copagoAmount,
  todayKey,
  view,
}: {
  patients: PatientRow[];
  copagoAmount: number;
  todayKey: string;
  view: "active" | "archived";
}) {
  const [selected, setSelected] = React.useState<PatientRow | null>(null);
  const [tab, setTab] = React.useState("turnos");
  const [copagoFor, setCopagoFor] = React.useState<PatientRow | null>(null);
  const [deleting, setDeleting] = React.useState<PatientRow | null>(null);
  const [bookings, setBookings] = React.useState<MyBooking[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Form state para editar paciente
  const [nombre, setNombre] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [cobertura, setCobertura] = React.useState<string>("PARTICULAR");
  const [obraSocial, setObraSocial] = React.useState("");
  const [copago, setCopago] = React.useState(false);
  const [sesiones, setSesiones] = React.useState(0);
  const [primeraVez, setPrimeraVez] = React.useState(false);

  function openPatient(patient: PatientRow, initialTab: "turnos" | "datos") {
    setSelected(patient);
    setTab(initialTab);
    setNombre(patient.name);
    setEmail(patient.email);
    setTelefono(patient.phone ?? "");
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
        name: nombre,
        email,
        phone: telefono,
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

  function handleReactivate(patient: PatientRow) {
    startTransition(async () => {
      const result = await reactivatePatientAction(patient.id);
      if (result.success) toast.success("Paciente reactivado");
      else toast.error(result.error);
    });
  }

  if (patients.length === 0 && view === "active") {
    return (
      <>
        <ViewToggle view={view} />
        <EmptyState
          icon={Users}
          title="Todavía no hay pacientes"
          description="Cuando se registren pacientes, vas a verlos acá con su historial."
        />
      </>
    );
  }

  return (
    <>
      <ViewToggle view={view} />

      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay pacientes archivados"
          description="Los pacientes que archives van a aparecer acá para reactivarlos."
        />
      ) : (
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
                <TableHead className="w-[1%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => {
                const owed = Math.max(0, p.copagoAttended - p.copagoPaid);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {p.archived ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            Archivado
                          </Badge>
                        ) : (
                          p.esPrimeraVez && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              Primera vez
                            </Badge>
                          )
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
                      <button
                        type="button"
                        onClick={() => setCopagoFor(p)}
                        className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Registrar copago"
                      >
                        {owed === 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Al día
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 tabular-nums">
                            Debe {formatARS(owed * copagoAmount)}
                            <span className="ml-1 font-normal opacity-80">({owed})</span>
                          </Badge>
                        )}
                        <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </TableCell>
                    <TableCell>
                      {p.archived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleReactivate(p)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reactivar
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openPatient(p, "turnos")}>
                              <CalendarClock className="h-4 w-4" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openPatient(p, "datos")}>
                              <Pencil className="h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setDeleting(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detalle / edición */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="turnos">Turnos</TabsTrigger>
              <TabsTrigger value="datos">Editar datos</TabsTrigger>
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
              <form onSubmit={handleSavePatient} className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto p-1">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  El email es el usuario de acceso del paciente. Si lo cambiás,
                  deberá iniciar sesión con el nuevo email (su contraseña no cambia).
                </p>

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
                    <div className="text-sm text-muted-foreground">El paciente debe abonar copago</div>
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

                <div className="flex justify-end pt-2">
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

      <DeletePatientDialog
        patient={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function ViewToggle({ view }: { view: "active" | "archived" }) {
  return (
    <div className="mb-4 inline-flex rounded-lg border p-1 text-sm">
      <Link
        href="/admin/pacientes"
        className={cn(
          "rounded-md px-3 py-1.5 font-medium transition-colors",
          view === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Activos
      </Link>
      <Link
        href="/admin/pacientes?view=archived"
        className={cn(
          "rounded-md px-3 py-1.5 font-medium transition-colors",
          view === "archived" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Archivados
      </Link>
    </div>
  );
}

// ── Eliminar paciente (con impacto + soft/hard delete) ───────────────────────
function DeletePatientDialog({
  patient,
  onClose,
}: {
  patient: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [impact, setImpact] = React.useState<Impact | null>(null);
  const [loadingImpact, setLoadingImpact] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!patient) {
      setImpact(null);
      return;
    }
    setLoadingImpact(true);
    void getPatientDeletionImpactAction(patient.id).then((result) => {
      if (result.success) setImpact(result.data);
      else toast.error(result.error);
      setLoadingImpact(false);
    });
  }, [patient]);

  function handleDelete() {
    if (!patient) return;
    startTransition(async () => {
      const result = await deletePatientAction(patient.id);
      if (result.success) {
        toast.success(
          result.data.mode === "deleted"
            ? "Paciente eliminado"
            : "Paciente archivado (su historial se conserva)",
        );
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  const isSoft = impact?.hasHistory ?? true;

  return (
    <Dialog open={Boolean(patient)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isSoft ? "Archivar paciente" : "Eliminar paciente"}
          </DialogTitle>
          <DialogDescription>{patient?.name}</DialogDescription>
        </DialogHeader>

        {loadingImpact || !impact ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Revisando el historial…
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {impact.hasHistory ? (
              <>
                <p>
                  Este paciente tiene historial asociado, así que <strong>no se borra</strong>:
                  se <strong>archiva</strong> (baja lógica). Deja de aparecer en la lista
                  activa y no podrá reservar, pero se conservan sus turnos, asistencias y
                  pagos.
                </p>
                <ul className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <li>Turnos en total: <strong>{impact.bookings}</strong></li>
                  <li>Asistencias registradas: <strong>{impact.attendances}</strong></li>
                  <li>Pagos registrados: <strong>{impact.payments}</strong></li>
                </ul>
                {impact.futureBookings > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300">
                    Tiene <strong>{impact.futureBookings}</strong>{" "}
                    {impact.futureBookings === 1 ? "turno futuro" : "turnos futuros"}: se
                    cancelarán y se liberará el cupo.
                  </p>
                )}
              </>
            ) : (
              <p>
                Esta cuenta no tiene turnos, asistencias ni pagos asociados. Se eliminará de
                forma <strong>permanente</strong>. Esta acción no se puede deshacer.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || loadingImpact || !impact}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSoft ? "Archivar" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
