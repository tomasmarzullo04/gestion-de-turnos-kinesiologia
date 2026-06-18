"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { toggleProfessionalActiveAction } from "@/app/(admin)/actions";
import {
  ProfessionalFormDialog,
  type ProfessionalDTO,
} from "@/app/(admin)/admin/profesionales/professional-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
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

export function ProfessionalsManager({
  professionals,
}: {
  professionals: ProfessionalDTO[];
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProfessionalDTO | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleToggle(p: ProfessionalDTO) {
    startTransition(async () => {
      const result = await toggleProfessionalActiveAction(p.id, !p.active);
      if (result.success) {
        toast.success(p.active ? "Profesional desactivado" : "Profesional activado");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo profesional
        </Button>
      </div>

      {professionals.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Todavía no hay profesionales"
          description="Agregá los profesionales del estudio para mostrarlos en el portal."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
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
    </>
  );
}
