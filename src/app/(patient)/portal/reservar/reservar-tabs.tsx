"use client";

import { CalendarPlus, CalendarRange } from "lucide-react";

import { BookingFlow } from "@/app/(patient)/portal/reservar/booking-flow";
import { SeriesBuilder } from "@/app/(patient)/portal/reservar/series-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ServiceOption } from "@/components/features/service-selector";
import { type DayAvailability } from "@/server/services/slot.service";

interface Props {
  services: ServiceOption[];
  days: DayAvailability[];
  esPrimerRehab: boolean;
  todayKey: string;
  defaultToDate: string;
}

export function ReservarTabs({ services, days, esPrimerRehab, todayKey, defaultToDate }: Props) {
  return (
    <Tabs defaultValue="single" className="space-y-4">
      <TabsList>
        <TabsTrigger value="single" className="gap-1.5">
          <CalendarPlus className="h-4 w-4" />
          Turno único
        </TabsTrigger>
        <TabsTrigger value="series" className="gap-1.5">
          <CalendarRange className="h-4 w-4" />
          Turno fijo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <BookingFlow
          services={services}
          days={days}
          initialDate={null}
          initialSlots={[]}
          esPrimerRehab={esPrimerRehab}
        />
      </TabsContent>

      <TabsContent value="series">
        <SeriesBuilder
          services={services}
          esPrimerRehab={esPrimerRehab}
          todayKey={todayKey}
          defaultToDate={defaultToDate}
        />
      </TabsContent>
    </Tabs>
  );
}
