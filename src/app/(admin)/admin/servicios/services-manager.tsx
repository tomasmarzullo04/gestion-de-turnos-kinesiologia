"use client";

import * as React from "react";
import { Clock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteServiceAction,
  toggleServiceActiveAction,
} from "@/app/(admin)/actions";
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
import {
  ServiceFormDialog,
  type ServiceDTO,
} from "@/app/(admin)/admin/servicios/service-form-dialog";

export function ServicesManager({ services }: { services: ServiceDTO[] }) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceDTO | null>(null);
  const [deleting, setDeleting] = React.useState<ServiceDTO | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(service: ServiceDTO) {
    setEditing(service);
    setFormOpen(true);
  }

  function handleToggle(service: ServiceDTO) {
    startTransition(async () => {
      const result = await toggleServiceActiveAction(
        service.id,
        !service.active,
      );
      if (result.success) {
        toast.success(service.active ? "Servicio desactivado" : "Servicio activado");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteServiceAction(deleting.id);
      if (result.success) {
        toast.success("Servicio eliminado");
        setDeleting(null);
      } else {
        toast.error(result.error);
        setDeleting(null);
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Todavía no hay servicios"
          description="Creá tu primer servicio para empezar a recibir reservas."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo servicio
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[1%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium">{service.name}</div>
                    {service.description && (
                      <div className="line-clamp-1 text-sm text-muted-foreground">
                        {service.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {service.durationMinutes} min
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.active}
                        disabled={isPending}
                        onCheckedChange={() => handleToggle(service)}
                        aria-label="Activar/desactivar servicio"
                      />
                      <span className="text-sm text-muted-foreground">
                        {service.active ? "Activo" : "Inactivo"}
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
                        <DropdownMenuItem onSelect={() => openEdit(service)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleting(service)}
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

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar servicio"
        description={`¿Seguro que querés eliminar "${deleting?.name}"? Si tiene turnos activos, se desactivará en su lugar.`}
        confirmLabel="Eliminar"
        destructive
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
