"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { type AttendanceTrendDay } from "@/server/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function AttendanceTrendChart({ data }: { data: AttendanceTrendDay[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tendencia de Asistencia</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <EmptyState
            icon={TrendingUp}
            title="Sin datos"
            description="No hay información suficiente para los últimos días."
          />
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(d => ({
    ...d,
    shortDate: format(parseISO(d.date), "dd MMM", { locale: es })
  }));

  const presentColor = isDark ? "#10b981" : "#059669"; // Emerald para presentes
  const absentColor = isDark ? "#ef4444" : "#dc2626"; // Red para ausentes

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Asistencia últimos 7 días</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27272a" : "#e4e4e7"} />
              <XAxis 
                dataKey="shortDate" 
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
                cursor={{ stroke: isDark ? "#3f3f46" : "#d4d4d8", strokeWidth: 2 }}
                contentStyle={{
                  backgroundColor: isDark ? "#18181b" : "#ffffff",
                  borderColor: isDark ? "#27272a" : "#e4e4e7",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: isDark ? "#f4f4f5" : "#09090b",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="present" 
                name="Presentes" 
                stroke={presentColor} 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="absent" 
                name="Ausentes" 
                stroke={absentColor} 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
