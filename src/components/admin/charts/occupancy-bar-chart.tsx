"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { type SlotOccupancy } from "@/server/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export function OccupancyBarChart({ data }: { data: SlotOccupancy[] }) {
  const { theme } = useTheme();
  
  // Adaptamos colores según si estamos en modo claro o oscuro. Usaremos variables CSS para mayor exactitud pero Recharts necesita strings para fill.
  const isDark = theme === "dark";
  const primaryColor = isDark ? "#10b981" : "#059669"; // Emerald para primary/success look
  const freeColor = isDark ? "#3f3f46" : "#e4e4e7"; // zinc-700 / zinc-200

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ocupación por Franja</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <EmptyState
            icon={BarChart3}
            title="Sin datos"
            description="No hay franjas registradas para el día de hoy."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Ocupación por Franja (Hoy)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#e4e4e7"} />
              <XAxis 
                dataKey="time" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }} 
                dy={10}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }}
              />
              <Tooltip
                cursor={{ fill: isDark ? "#27272a" : "#f4f4f5" }}
                contentStyle={{
                  backgroundColor: isDark ? "#18181b" : "#ffffff",
                  borderColor: isDark ? "#27272a" : "#e4e4e7",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: isDark ? "#f4f4f5" : "#09090b",
                }}
                itemStyle={{ color: isDark ? "#f4f4f5" : "#09090b" }}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />
              <Bar 
                dataKey="booked" 
                name="Reservados" 
                stackId="a" 
                fill={primaryColor} 
                radius={[0, 0, 4, 4]} 
                isAnimationActive={false} // Respeta prefers-reduced-motion si es necesario, o se puede habilitar si se desea
              />
              <Bar 
                dataKey="free" 
                name="Libres" 
                stackId="a" 
                fill={freeColor} 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
