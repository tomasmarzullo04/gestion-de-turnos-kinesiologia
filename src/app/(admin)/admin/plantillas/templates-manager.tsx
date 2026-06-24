"use client";

import * as React from "react";
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteTemplateAction,
  toggleTemplateActiveAction,
} from "@/app/(admin)/actions";
import {
  TemplateFormDialog,
  type TemplateDTO,
} from "@/app/(admin)/admin/plantillas/template-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dayLabel } from "@/lib/constants";

interface TemplateRow extends TemplateDTO {
  active: boolean;
  serviceName: string | null;
  serviceColor: string | null;
}

export function TemplatesManager({
  templates,
  services,
}: {
  templates: TemplateRow[];
  services: { id: string; name: string; capacity: number }[];
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateDTO | null>(null);
  const [deleting, setDeleting] = React.useState<TemplateRow | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleToggle(t: TemplateRow) {
    startTransition(async () => {
      const result = await toggleTemplateActiveAction(t.id, !t.active);
      if (result.success) {
        toast.success(t.active ? "Plantilla desactivada" : "Plantilla activada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(deleting.id);
      if (result.success) toast.success("Plantilla eliminada");
      else toast.error(result.error);
      setDeleting(null);
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Los cambios se publican automáticamente; no hace falta generar nada.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Todavía no hay plantillas"
          description="Creá plantillas (día + horario + capacidad) y después generá la agenda."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[1%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {dayLabel(t.dayOfWeek)}
                  </TableCell>
                  <TableCell>
                    {t.serviceName ? (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: t.serviceColor || undefined,
                          color: t.serviceColor || undefined,
                        }}
                      >
                        {t.serviceName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {t.startTime} – {t.endTime}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.capacity} cupos</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.active}
                        disabled={isPending}
                        onCheckedChange={() => handleToggle(t)}
                        aria-label="Activar/desactivar plantilla"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleting(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        services={services}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar plantilla"
        description={
          deleting
            ? `¿Eliminar la plantilla de ${dayLabel(deleting.dayOfWeek)} (${deleting.startTime}–${deleting.endTime})? No afecta las franjas ya generadas.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
