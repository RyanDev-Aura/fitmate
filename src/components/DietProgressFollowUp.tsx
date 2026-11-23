"use client";

import React, { useMemo, useState } from "react";
import {
  BodyProgressLog,
  ProgressMetric,
  ProgressPeriod,
  buildPeriodSeries,
  calculateProgressComparison,
} from "@/lib/progressAnalytics";

interface DietProgressFollowUpProps {
  logs: BodyProgressLog[];
  targetWeightKg?: number | null;
  loading?: boolean;
  onSaveLog: (payload: Omit<BodyProgressLog, "id" | "user_id">) => Promise<void>;
}

export default function DietProgressFollowUp({
  logs,
  targetWeightKg,
  loading = false,
  onSaveLog,
}: DietProgressFollowUpProps) {
  const [period, setPeriod] = useState<ProgressPeriod>("daily");
  const [metric, setMetric] = useState<ProgressMetric>("weight");

  const [recordedDate, setRecordedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [weightInput, setWeightInput] = useState<string>("");
  const [waistInput, setWaistInput] = useState<string>("");
  const [chestInput, setChestInput] = useState<string>("");
  const [hipInput, setHipInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const comparison = useMemo(() => calculateProgressComparison(logs), [logs]);
  const series = useMemo(() => buildPeriodSeries(logs, period), [logs, period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedWeight = Number(weightInput);
    if (!parsedWeight || parsedWeight <= 20 || parsedWeight >= 400) {
      setFeedback("Masukkan berat badan yang valid (dalam kg).");
      return;
    }

    const parseOptional = (val: string) => {
      if (!val.trim()) return null;
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    };

    setSubmitting(true);
    try {
      await onSaveLog({
        recorded_date: recordedDate,
        weight_kg: parsedWeight,
        waist_cm: parseOptional(waistInput),
        chest_cm: parseOptional(chestInput),
        hip_cm: parseOptional(hipInput),
        notes: notesInput.trim() || null,
      });
      setWeightInput("");
      setWaistInput("");
      setChestInput("");
      setHipInput("");
      setNotesInput("");
      setFeedback("Data follow-up berhasil disimpan dan grafik diperbarui.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan data progres.";
      setFeedback(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMetricValue = (point: (typeof series)[number]): number | null => {
    if (metric === "weight") return point.weightAvg;
    if (metric === "waist") return point.waistAvg;
    if (metric === "chest") return point.chestAvg;
    return point.hipAvg;
  };

  const chartPoints = useMemo(() => {
    const valid = series
      .map((pt, index) => ({
        index,
        label: pt.label,
        value: getMetricValue(pt),
      }))
      .filter((item): item is { index: number; label: string; value: number } =>
        typeof item.value === "number"
      );

    if (!valid.length) return [];

    const vals = valid.map((v) => v.value);
    const min = Math.min(...vals) - 1;
    const max = Math.max(...vals) + 1;
    const span = Math.max(max - min, 1);

    const svgWidth = 600;
    const svgHeight = 200;
    const padX = 32;
    const padY = 24;

    return valid.map((item, idx) => {
      const x =
        valid.length === 1
          ? svgWidth / 2
          : padX + (idx / (valid.length - 1)) * (svgWidth - padX * 2);
      const y =
        svgHeight - padY - ((item.value - min) / span) * (svgHeight - padY * 2);
      return { ...item, x, y };
    });
  }, [series, metric]);

  const polylineStr = chartPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const formatDelta = (delta: number | null, unit: string) => {
    if (delta === null) return "-";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta} ${unit}`;
  };

  const recentLogsDesc = useMemo(
    () =>
      [...logs].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date)),
    [logs]
  );

  return (
    <div className="space-y-5 text-white">
      {/* Ringkasan Hasil Nyata Sejak Hari Pertama */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs text-neutral-400">Perubahan BB Sejak Awal</p>
          <p className="mt-1 text-2xl font-bold text-[#9EF01A]">
            {formatDelta(comparison.weightDeltaKg, "kg")}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Awal: {comparison.startWeight ?? "-"} kg → Terkini:{" "}
            {comparison.latestWeight ?? "-"} kg
            {targetWeightKg ? ` • Target: ${targetWeightKg} kg` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs text-neutral-400">Perubahan Lingkar Pinggang</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatDelta(comparison.waistDeltaCm, "cm")}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Awal: {comparison.startWaist ?? "-"} cm → Terkini:{" "}
            {comparison.latestWaist ?? "-"} cm
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs text-neutral-400">Perubahan Dada & Pinggul</p>
          <p className="mt-1 text-sm font-semibold text-white">
            Dada: {formatDelta(comparison.chestDeltaCm, "cm")} • Pinggul:{" "}
            {formatDelta(comparison.hipDeltaCm, "cm")}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Total {comparison.totalLogs}x follow-up sejak{" "}
            {comparison.startDate ?? "-"}
          </p>
        </div>
      </div>

      {/* Grafik Harian, Mingguan, Bulanan */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Grafik Perkembangan Program Diet
            </h3>
            <p className="text-xs text-neutral-400">
              Pantau tren harian, rata-rata mingguan, dan evaluasi bulanan
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl bg-neutral-950 p-1">
              {(["daily", "weekly", "monthly"] as ProgressPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    period === p
                      ? "bg-[#9EF01A] text-black"
                      : "text-neutral-300 hover:text-white"
                  }`}
                >
                  {p === "daily"
                    ? "Harian"
                    : p === "weekly"
                    ? "Mingguan"
                    : "Bulanan"}
                </button>
              ))}
            </div>

            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as ProgressMetric)}
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-white"
            >
              <option value="weight">Berat Badan (kg)</option>
              <option value="waist">Lingkar Pinggang (cm)</option>
              <option value="chest">Lingkar Dada (cm)</option>
              <option value="hip">Lingkar Pinggul (cm)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="py-12 text-center text-xs text-neutral-400">
            Memuat data progres...
          </p>
        ) : chartPoints.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox="0 0 600 200"
              className="h-52 w-full min-w-[440px]"
              role="img"
              aria-label="Grafik perkembangan berat badan dan bentuk fisik"
            >
              <polyline
                fill="none"
                stroke="#9EF01A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylineStr}
              />
              {chartPoints.map((pt) => (
                <g key={`${pt.label}-${pt.index}`}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#9EF01A" />
                  <text
                    x={pt.x}
                    y={pt.y - 9}
                    textAnchor="middle"
                    fill="#F5F5F5"
                    fontSize="10"
                  >
                    {pt.value}
                  </text>
                  <text
                    x={pt.x}
                    y={192}
                    textAnchor="middle"
                    fill="#A3A3A3"
                    fontSize="10"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <p className="py-12 text-center text-xs text-neutral-400">
            Belum ada catatan untuk metrik/periode ini. Tambahkan follow-up pertama Anda di bawah.
          </p>
        )}
      </div>

      {/* Form Input Follow-Up BB & Perubahan Bentuk Fisik */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">
          Input Follow-Up Berat Badan & Bentuk Fisik
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-neutral-400">Tanggal</label>
            <input
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">
              Berat Badan (kg)*
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="Contoh: 72.4"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">
              Lingkar Pinggang (cm)
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="Contoh: 82"
              value={waistInput}
              onChange={(e) => setWaistInput(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">
              Dada / Pinggul (cm)
            </label>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <input
                type="number"
                step="0.5"
                placeholder="Dada"
                value={chestInput}
                onChange={(e) => setChestInput(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Pinggul"
                value={hipInput}
                onChange={(e) => setHipInput(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-white"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400">
            Catatan Perubahan Fisik / Kondisi Tubuh
          </label>
          <input
            type="text"
            placeholder="Contoh: Lingkar perut mengecil, baju lama mulai pas"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white"
          />
        </div>

        {feedback && (
          <p className="text-xs text-[#9EF01A]">{feedback}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#9EF01A] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
        >
          {submitting ? "Menyimpan..." : "Simpan Follow-Up Progres"}
        </button>
      </form>

      {/* Riwayat Check-In Singkat */}
      {recentLogsDesc.length > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Riwayat Follow-Up Terbaru
          </h3>
          <div className="space-y-2">
            {recentLogsDesc.slice(0, 7).map((item) => (
              <div
                key={`${item.recorded_date}-${item.weight_kg}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800/90 bg-neutral-950/80 px-3 py-2 text-xs"
              >
                <span className="font-medium text-neutral-200">
                  {item.recorded_date}
                </span>
                <span className="font-semibold text-[#9EF01A]">
                  {item.weight_kg} kg
                </span>
                <span className="text-neutral-400">
                  {item.waist_cm ? `Pinggang: ${item.waist_cm} cm` : "Pinggang: -"}
                </span>
                {item.notes && (
                  <span className="w-full text-neutral-400 sm:w-auto">
                    “{item.notes}”
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}