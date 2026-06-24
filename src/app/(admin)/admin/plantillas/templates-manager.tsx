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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // Agrupar las plantillas por servicio para una vista prolija.
  const groups = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string | null; items: TemplateRow[] }
    >();
    for (const t of templates) {
      const key = t.serviceId ?? "__none__";
      if (!map.has(key)) {
        map.set(key, {
          name: t.serviceName ?? "Sin servicio",
          color: t.serviceColor,
          items: [],
        });
      }
      map.get(key)!.items.push(t);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

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
          title="Todavía no hay horarios"
          description="Creá horarios por servicio (día + rango + cupos). Se publican solos en la disponibilidad del socio."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo horario
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.name}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: g.color ?? "#9ca3af" }}
                    aria-hidden="true"
                  />
                  {g.name}
                </CardTitle>
                <Badge variant="secondary">
                  {g.items.length} {g.items.length === 1 ? "horario" : "horarios"}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Cupos/hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[1%]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          {dayLabel(t.dayOfWeek)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {t.startTime} – {t.endTime}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t.capacity}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={t.active}
                              disabled={isPending}
                              onCheckedChange={() => handleToggle(t)}
                              aria-label="Activar/desactivar horario"
                            />
                            <span className="text-sm text-muted-foreground">
                              {t.active ? "Activo" : "Inactivo"}
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
              </CardContent>
            </Card>
          ))}
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
            ? `¿Eliminar el horario de ${dayLabel(deleting.dayOfWeek)} (${deleting.startTime}–${deleting.endTime})? Se quitan las franjas futuras sin reservas; las que ya tienen gente anotada no se tocan.`
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
