import { analyticsService } from "./src/server/services/analytics.service";

async function run() {
  const kpis = await analyticsService.getDailyKPIs("2026-06-19");
  console.log("Daily KPIs:", kpis);
  const trend = await analyticsService.getAttendanceTrend("2026-06-19", 7);
  console.log("Trend:", trend);
}

run().catch(console.error);
