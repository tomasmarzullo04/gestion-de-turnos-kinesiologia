"use client";

import * as React from "react";
import { CalendarRange } from "lucide-react";

import { dayLabel } from "@/lib/constants";

export interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface Props {
  serviceName: string;
  entries: ScheduleEntry[];
  restrictRehab?: boolean;
}

// Lunes primero (0 = domingo).
const order = (d: number) => (d === 0 ? 7 : d);

export function ServiceScheduleHint({ serviceName, entries, restrictRehab }: Props) {
  const byDay = React.useMemo(() => {
    const map = new Map<number, ScheduleEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.dayOfWeek) ?? [];
      arr.push(e);
      map.set(e.dayOfWeek, arr);
    }
    return [...map.entries()]
      .map(([day, ranges]) => ({
        day,
        ranges: ranges.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
      .sort((a, b) => order(a.day) - order(b.day));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
        {serviceName} no tiene horarios configurados por ahora.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 font-medium">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        {serviceName} se ofrece:
      </p>
      <ul className="space-y-0.5">
        {byDay.map((g) => (
          <li key={g.day} className="flex flex-wrap gap-x-2 text-muted-foreground">
            <span className="min-w-[5.5rem] font-medium text-foreground">{dayLabel(g.day)}</span>
            <span className="tabular-nums">
              {g.ranges
                .map((r) => `${r.startTime}–${r.endTime} (${r.capacity} cupos)`)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      {restrictRehab && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Para tu primer turno de rehabilitación solo podés reservar lunes a la tarde, miércoles, o
          viernes a la mañana.
        </p>
      )}
    </div>
  );
}
