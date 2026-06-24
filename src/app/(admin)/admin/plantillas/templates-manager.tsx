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
  deleteTemplateGroupAction,
  toggleTemplateGroupActiveAction,
} from "@/app/(admin)/actions";
import {
  TemplateFormDialog,
  type TemplateGroupDTO,
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

export interface TemplateRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  serviceId: string | null;
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
  const [editing, setEditing] = React.useState<TemplateGroupDTO | null>(null);
  const [deleting, setDeleting] = React.useState<TemplateGroupDTO | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleToggle(t: TemplateGroupDTO) {
    startTransition(async () => {
      const result = await toggleTemplateGroupActiveAction(t.dayOfWeek, t.serviceId, !t.active);
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
      const result = await deleteTemplateGroupAction(deleting.dayOfWeek, deleting.serviceId);
      if (result.success) toast.success("Plantilla eliminada");
      else toast.error(result.error);
      setDeleting(null);
    });
  }

  // Agrupar las plantillas por servicio, y luego por día.
  const groups = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string | null; days: Map<number, TemplateGroupDTO> }
    >();
    for (const t of templates) {
      const key = t.serviceId ?? "__none__";
      if (!map.has(key)) {
        map.set(key, {
          name: t.serviceName ?? "Sin servicio",
          color: t.serviceColor,
          days: new Map(),
        });
      }
      
      const srvGroup = map.get(key)!;
      if (!srvGroup.days.has(t.dayOfWeek)) {
        srvGroup.days.set(t.dayOfWeek, {
          dayOfWeek: t.dayOfWeek,
          serviceId: t.serviceId,
          active: t.active,
          ranges: [],
        });
      }
      
      srvGroup.days.get(t.dayOfWeek)!.ranges.push({
        startTime: t.startTime,
        endTime: t.endTime,
        capacity: t.capacity,
      });
    }
    
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => ({
        ...g,
        items: [...g.days.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      }));
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
                  {g.items.length} {g.items.length === 1 ? "día" : "días"}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead>Franjas Horarias</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[1%]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((t) => (
                      <TableRow key={t.dayOfWeek}>
                        <TableCell className="font-medium">
                          {dayLabel(t.dayOfWeek)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <div className="flex flex-col gap-2">
                            {t.ranges.map((r, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="bg-muted px-2 py-1 rounded-md text-sm">
                                  {r.startTime} – {r.endTime}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {r.capacity} cupos
                                </Badge>
                              </div>
                            ))}
                          </div>
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
            ? `¿Eliminar la plantilla del ${dayLabel(deleting.dayOfWeek)}? Se quitan las franjas futuras sin reservas; las que ya tienen gente anotada no se tocan.`
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
