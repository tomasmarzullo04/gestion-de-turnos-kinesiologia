"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import {
  Ban,
  CalendarOff,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  ChevronDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  createBlockAction,
  deleteBlockAction,
} from "@/app/(admin)/actions";
import type { BlockView } from "@/server/services/block.service";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ServiceOption {
  id: string;
  name: string;
  color: string;
}

interface BloqueosViewProps {
  initialBlocks: BlockView[];
  services: ServiceOption[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateRange(from: string, to: string): string {
  const df = parse(from, "yyyy-MM-dd", new Date());
  const dt = parse(to, "yyyy-MM-dd", new Date());
  const fmtFrom = format(df, "EEE d/MM", { locale: es });
  if (from === to) return fmtFrom;
  const fmtTo = format(dt, "EEE d/MM", { locale: es });
  return `${fmtFrom} → ${fmtTo}`;
}

function formatTimeRange(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  return `${from} – ${to} hs`;
}

function blockTypeBadge(type: "TOTAL" | "FIRST_TIME") {
  if (type === "TOTAL") {
    return (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" /> Total
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <ShieldAlert className="h-3 w-3" /> Solo primerizos
    </Badge>
  );
}

function dateKeyFromDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// ── Componente principal ───────────────────────────────────────────────────────
export function BloqueosView({ initialBlocks, services }: BloqueosViewProps) {
  const [blocks, setBlocks] = React.useState(initialBlocks);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BlockView | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Formulario de creación ─────────────────────────────────────────────────
  const [serviceId, setServiceId] = React.useState<string | null>(null);
  const [blockType, setBlockType] = React.useState<"TOTAL" | "FIRST_TIME">("TOTAL");
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(new Date());
  const [dateTo, setDateTo] = React.useState<Date | undefined>(new Date());
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [useRange, setUseRange] = React.useState(false);
  const [useTime, setUseTime] = React.useState(false);
  const [timeFrom, setTimeFrom] = React.useState("08:00");
  const [timeTo, setTimeTo] = React.useState("20:00");
  const [reason, setReason] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Date picker popovers
  const [dateFromOpen, setDateFromOpen] = React.useState(false);
  const [dateToOpen, setDateToOpen] = React.useState(false);

  function resetForm() {
    setServiceId(null);
    setBlockType("TOTAL");
    setDateFrom(new Date());
    setDateTo(new Date());
    setShowAdvanced(false);
    setUseRange(false);
    setUseTime(false);
    setTimeFrom("08:00");
    setTimeTo("20:00");
    setReason("");
  }

  // Resumen legible del bloqueo que se va a crear
  const summary = React.useMemo(() => {
    const svc = serviceId
      ? services.find((s) => s.id === serviceId)?.name ?? "servicio"
      : "todos los servicios";
    const tipo = blockType === "TOTAL"
      ? "para todos los pacientes"
      : "solo para pacientes primerizos";

    let cuando = "";
    if (dateFrom) {
      const df = format(dateFrom, "EEEE d/MM", { locale: es });
      if (useRange && dateTo && dateKeyFromDate(dateTo) !== dateKeyFromDate(dateFrom)) {
        const dt = format(dateTo, "EEEE d/MM", { locale: es });
        cuando = `del ${df} al ${dt}`;
      } else {
        cuando = `el ${df}`;
      }
    }

    let horario = "";
    if (useTime) {
      horario = ` de ${timeFrom} a ${timeTo}`;
    }

    return `Vas a bloquear ${svc} ${cuando}${horario} ${tipo}.`;
  }, [serviceId, blockType, dateFrom, dateTo, useRange, useTime, timeFrom, timeTo, services]);

  async function handleCreate() {
    if (!dateFrom) return;
    setCreating(true);
    const effectiveTo = useRange && dateTo ? dateTo : dateFrom;
    const result = await createBlockAction({
      serviceId: serviceId || null,
      blockType,
      dateFrom: dateKeyFromDate(dateFrom),
      dateTo: dateKeyFromDate(effectiveTo),
      timeFrom: useTime ? timeFrom : null,
      timeTo: useTime ? timeTo : null,
      reason: reason.trim() || undefined,
    });

    if (result.success) {
      toast.success("Bloqueo creado");
      setShowCreate(false);
      resetForm();
      // Refrescar la lista (page revalidation)
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteBlockAction({ blockId: deleteTarget.id });
    if (result.success) {
      toast.success("Bloqueo eliminado");
      setBlocks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  }

  return (
    <>
      {/* ── Botón de crear ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo bloqueo
        </Button>
      </div>

      {/* ── Lista de bloqueos ───────────────────────────────────────── */}
      {blocks.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="Sin bloqueos activos"
          description="No hay bloqueos de agenda vigentes. Creá uno para cerrar turnos en fechas o servicios específicos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <Card key={b.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
              {/* Barra de color del servicio */}
              <div
                className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg"
                style={{ backgroundColor: b.serviceColor ?? "#6366f1" }}
              />

              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2 pl-5">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-sm font-semibold leading-tight">
                    {b.serviceName ?? "Todos los servicios"}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {blockTypeBadge(b.blockType)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  onClick={() => setDeleteTarget(b)}
                  aria-label="Eliminar bloqueo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-1 pl-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {formatDateRange(b.dateFrom, b.dateTo)}
                </p>
                {formatTimeRange(b.timeFrom, b.timeTo) && (
                  <p className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeRange(b.timeFrom, b.timeTo)}
                  </p>
                )}
                {b.reason && (
                  <p className="text-xs italic">{b.reason}</p>
                )}
                <p className="text-xs text-muted-foreground/70 pt-1">
                  Creado por {b.createdByName ?? "profesional"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog de creación ──────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo bloqueo</DialogTitle>
            <DialogDescription>
              Seleccioná el servicio, la fecha y el tipo de bloqueo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Servicio */}
            <div className="space-y-2">
              <Label>Servicio</Label>
              <Select
                value={serviceId ?? "__all__"}
                onValueChange={(v) => setServiceId(v === "__all__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los servicios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los servicios</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de bloqueo</Label>
              <Select
                value={blockType}
                onValueChange={(v) => setBlockType(v as "TOTAL" | "FIRST_TIME")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOTAL">
                    <span className="flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                      Total — nadie reserva
                    </span>
                  </SelectItem>
                  <SelectItem value="FIRST_TIME">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      Solo primerizos bloqueados
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label>{useRange ? "Fecha desde" : "Fecha"}</Label>
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    {dateFrom
                      ? format(dateFrom, "EEEE d 'de' MMMM yyyy", { locale: es })
                      : "Seleccioná una fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => {
                      setDateFrom(d);
                      if (!useRange) setDateTo(d);
                      setDateFromOpen(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Opciones avanzadas */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              Opciones avanzadas
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4 animate-fade-in">
                {/* Rango de fechas */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="use-range"
                    checked={useRange}
                    onChange={(e) => {
                      setUseRange(e.target.checked);
                      if (!e.target.checked) setDateTo(dateFrom);
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="use-range" className="cursor-pointer">
                    Rango de días
                  </Label>
                </div>

                {useRange && (
                  <div className="space-y-2">
                    <Label>Fecha hasta</Label>
                    <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          {dateTo
                            ? format(dateTo, "EEEE d 'de' MMMM yyyy", { locale: es })
                            : "Seleccioná la fecha de fin"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(d) => {
                            setDateTo(d);
                            setDateToOpen(false);
                          }}
                          disabled={(date) =>
                            date < (dateFrom ?? new Date(new Date().setHours(0, 0, 0, 0)))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Franjas horarias */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="use-time"
                    checked={useTime}
                    onChange={(e) => setUseTime(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="use-time" className="cursor-pointer">
                    Franja horaria específica
                  </Label>
                </div>

                {useTime && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Desde</Label>
                      <Input
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hasta</Label>
                      <Input
                        type="time"
                        value={timeTo}
                        onChange={(e) => setTimeTo(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Motivo */}
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Feriado, capacitación..."
                    maxLength={200}
                  />
                </div>
              </div>
            )}

            {/* Resumen */}
            {dateFrom && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-primary">{summary}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !dateFrom}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear bloqueo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de eliminación ───────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar bloqueo"
        description={
          deleteTarget
            ? `¿Querés eliminar el bloqueo de ${deleteTarget.serviceName ?? "todos los servicios"} (${formatDateRange(deleteTarget.dateFrom, deleteTarget.dateTo)})? Las franjas volverán a estar disponibles para los pacientes.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
