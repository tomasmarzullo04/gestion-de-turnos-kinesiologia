"use client";

import * as React from "react";
import { CalendarClock, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { getPatientBookingsAction } from "@/app/(admin)/actions";
import { BookingCard } from "@/components/features/booking-card";
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

interface PatientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  upcoming: number;
  total: number;
}

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const [selected, setSelected] = React.useState<PatientRow | null>(null);
  const [bookings, setBookings] = React.useState<MyBooking[]>([]);
  const [loading, setLoading] = React.useState(false);

  function openPatient(patient: PatientRow) {
    setSelected(patient);
    setBookings([]);
    setLoading(true);
    void getPatientBookingsAction(patient.id).then((result) => {
      if (result.success) setBookings(result.data);
      else toast.error(result.error);
      setLoading(false);
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
              <TableHead>Paciente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Próximos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[1%]">Turnos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>{p.email}</div>
                  {p.phone && <div>{p.phone}</div>}
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
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
