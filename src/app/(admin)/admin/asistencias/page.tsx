import type { Metadata } from "next";

import { AttendanceClient } from "@/app/(admin)/admin/asistencias/attendance-client";
import { PageHeader } from "@/components/shared/page-header";
import { toLocalDateKey } from "@/lib/datetime";
import { attendanceService } from "@/server/services/attendance.service";

export const metadata: Metadata = { title: "Asistencias" };
export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const todayKey = toLocalDateKey(new Date());
  const selectedDate = date && DATE_KEY.test(date) ? date : todayKey;

  const slots = await attendanceService.getDayWithAttendance(selectedDate);

  return (
    <div>
      <PageHeader
        title="Asistencias"
        description="Marcá quién asistió en cada franja. El listado sale de las reservas."
      />
      <AttendanceClient
        key={selectedDate}
        selectedDate={selectedDate}
        todayKey={todayKey}
        slots={slots}
      />
    </div>
  );
}
