"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteProfessionalAction,
  toggleProfessionalActiveAction,
} from "@/app/(admin)/actions";
import {
  ProfessionalFormDialog,
  type ProfessionalDTO,
} from "@/app/(admin)/admin/profesionales/professional-form-dialog";
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

interface ProfessionalRow extends ProfessionalDTO {
  appointmentsCount: number;
  availabilitiesCount: number;
}

export function ProfessionalsManager({
  professionals,
}: {
  professionals: ProfessionalRow[];
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProfessionalDTO | null>(null);
  const [deleting, setDeleting] = React.useState<ProfessionalRow | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleToggle(p: ProfessionalRow) {
    startTransition(async () => {
      const result = await toggleProfessionalActiveAction(p.id, !p.active);
      if (result.success) {
        toast.success(p.active ? "Profesional desactivado" : "Profesional activado");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteProfessionalAction(deleting.id);
      if (result.success) {
        toast.success("Profesional eliminado");
      } else {
        toast.error(result.error);
      }
      setDeleting(null);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo profesional
        </Button>
      </div>

      {professionals.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Todavía no hay profesionales"
          description="Agregá al menos un profesional para configurar agendas y recibir turnos."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo profesional
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesional</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[1%]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.specialty ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.availabilitiesCount} franja
                      {p.availabilitiesCount === 1 ? "" : "s"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={p.active}
                        disabled={isPending}
                        onCheckedChange={() => handleToggle(p)}
                        aria-label="Activar/desactivar profesional"
                      />
                      <span className="text-sm text-muted-foreground">
                        {p.active ? "Activo" : "Inactivo"}
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
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProfessionalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        professional={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar profesional"
        description={`¿Eliminar a "${deleting?.name}"? No se puede si tiene turnos activos a futuro (en ese caso, desactivalo).`}
        confirmLabel="Eliminar"
        destructive
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
