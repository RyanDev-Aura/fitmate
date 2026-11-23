export type ProgressPeriod = "daily" | "weekly" | "monthly";
export type ProgressMetric = "weight" | "waist" | "chest" | "hip";

export interface BodyProgressLog {
  id?: string;
  user_id: string;
  recorded_date: string; // format: YYYY-MM-DD
  weight_kg: number;
  waist_cm?: number | null;
  chest_cm?: number | null;
  hip_cm?: number | null;
  arm_cm?: number | null;
  notes?: string | null;
}

export interface ProgressChartPoint {
  key: string;
  label: string;
  weightAvg: number;
  waistAvg: number | null;
  chestAvg: number | null;
  hipAvg: number | null;
  entriesCount: number;
}

export interface ProgressComparison {
  hasData: boolean;
  startDate: string | null;
  latestDate: string | null;
  startWeight: number | null;
  latestWeight: number | null;
  weightDeltaKg: number | null;
  startWaist: number | null;
  latestWaist: number | null;
  waistDeltaCm: number | null;
  startChest: number | null;
  latestChest: number | null;
  chestDeltaCm: number | null;
  startHip: number | null;
  latestHip: number | null;
  hipDeltaCm: number | null;
  totalLogs: number;
}

function getWeekStartDate(dateStr: string): string {
  const safeDate = new Date(`${dateStr}T00:00:00`);
  const day = safeDate.getDay(); // 0 = Minggu, 1 = Senin
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(safeDate);
  monday.setDate(safeDate.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function average(nums: number[], decimals = 2): number | null {
  if (!nums.length) return null;
  const sum = nums.reduce((acc, cur) => acc + cur, 0);
  const factor = Math.pow(10, decimals);
  return Math.round((sum / nums.length) * factor) / factor;
}

export function calculateProgressComparison(
  logs: BodyProgressLog[]
): ProgressComparison {
  if (!logs.length) {
    return {
      hasData: false,
      startDate: null,
      latestDate: null,
      startWeight: null,
      latestWeight: null,
      weightDeltaKg: null,
      startWaist: null,
      latestWaist: null,
      waistDeltaCm: null,
      startChest: null,
      latestChest: null,
      chestDeltaCm: null,
      startHip: null,
      latestHip: null,
      hipDeltaCm: null,
      totalLogs: 0,
    };
  }

  const sorted = [...logs].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date)
  );
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  const firstWaist = sorted.find((l) => typeof l.waist_cm === "number")?.waist_cm ?? null;
  const latestWaist =
    [...sorted].reverse().find((l) => typeof l.waist_cm === "number")?.waist_cm ?? null;

  const firstChest = sorted.find((l) => typeof l.chest_cm === "number")?.chest_cm ?? null;
  const latestChest =
    [...sorted].reverse().find((l) => typeof l.chest_cm === "number")?.chest_cm ?? null;

  const firstHip = sorted.find((l) => typeof l.hip_cm === "number")?.hip_cm ?? null;
  const latestHip =
    [...sorted].reverse().find((l) => typeof l.hip_cm === "number")?.hip_cm ?? null;

  const startWeight = Number(first.weight_kg);
  const latestWeight = Number(latest.weight_kg);

  return {
    hasData: true,
    startDate: first.recorded_date,
    latestDate: latest.recorded_date,
    startWeight,
    latestWeight,
    weightDeltaKg: Math.round((latestWeight - startWeight) * 100) / 100,
    startWaist: firstWaist !== null ? Number(firstWaist) : null,
    latestWaist: latestWaist !== null ? Number(latestWaist) : null,
    waistDeltaCm:
      firstWaist !== null && latestWaist !== null
        ? Math.round((Number(latestWaist) - Number(firstWaist)) * 10) / 10
        : null,
    startChest: firstChest !== null ? Number(firstChest) : null,
    latestChest: latestChest !== null ? Number(latestChest) : null,
    chestDeltaCm:
      firstChest !== null && latestChest !== null
        ? Math.round((Number(latestChest) - Number(firstChest)) * 10) / 10
        : null,
    startHip: firstHip !== null ? Number(firstHip) : null,
    latestHip: latestHip !== null ? Number(latestHip) : null,
    hipDeltaCm:
      firstHip !== null && latestHip !== null
        ? Math.round((Number(latestHip) - Number(firstHip)) * 10) / 10
        : null,
    totalLogs: sorted.length,
  };
}

export function buildPeriodSeries(
  logs: BodyProgressLog[],
  period: ProgressPeriod
): ProgressChartPoint[] {
  if (!logs.length) return [];

  const sorted = [...logs].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date)
  );

  const bucketMap = new Map<
    string,
    {
      label: string;
      weights: number[];
      waists: number[];
      chests: number[];
      hips: number[];
    }
  >();

  for (const item of sorted) {
    let key = item.recorded_date;
    let label = item.recorded_date.slice(5); // MM-DD

    if (period === "weekly") {
      const weekStart = getWeekStartDate(item.recorded_date);
      key = weekStart;
      label = `W ${weekStart.slice(5)}`;
    } else if (period === "monthly") {
      const monthKey = item.recorded_date.slice(0, 7); // YYYY-MM
      key = monthKey;
      label = monthKey;
    }

    const current = bucketMap.get(key) ?? {
      label,
      weights: [],
      waists: [],
      chests: [],
      hips: [],
    };

    current.weights.push(Number(item.weight_kg));
    if (typeof item.waist_cm === "number" && !Number.isNaN(item.waist_cm)) {
      current.waists.push(Number(item.waist_cm));
    }
    if (typeof item.chest_cm === "number" && !Number.isNaN(item.chest_cm)) {
      current.chests.push(Number(item.chest_cm));
    }
    if (typeof item.hip_cm === "number" && !Number.isNaN(item.hip_cm)) {
      current.hips.push(Number(item.hip_cm));
    }

    bucketMap.set(key, current);
  }

  return Array.from(bucketMap.entries()).map(([key, bucket]) => ({
    key,
    label: bucket.label,
    weightAvg: average(bucket.weights, 2) ?? 0,
    waistAvg: average(bucket.waists, 1),
    chestAvg: average(bucket.chests, 1),
    hipAvg: average(bucket.hips, 1),
    entriesCount: bucket.weights.length,
  }));
}