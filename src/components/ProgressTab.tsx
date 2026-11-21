"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Lang } from "@/lib/i18n";
import {
  ActivityLevel,
  calculateIndividualTargets,
  FitnessGoal,
  Sex,
} from "@/lib/calorieTarget";

type BodyProgressRow = {
  id: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  notes: string | null;
  recorded_at: string;
};

type ProgressTabProps = {
  lang: Lang;
  onTargetsCalculated?: (targets: {
    dailyCalories: number;
    waterMl: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  }) => void;
};

function getLocalDateKey(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD waktu lokal perangkat
}

function getRecordedDateKey(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return getLocalDateKey(trimmed);
}

export default function ProgressTab({ lang, onTargetsCalculated }: ProgressTabProps) {
  const isId = lang === "id";

  const [weightKg, setWeightKg] = useState("72");
  const [heightCm, setHeightCm] = useState("170");
  const [age, setAge] = useState("24");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("light");
  const [goal, setGoal] = useState<FitnessGoal>("lose_fat");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<BodyProgressRow[]>([]);
  const [todayKey, setTodayKey] = useState<string>(() => getLocalDateKey());
  const [selectedDate, setSelectedDate] = useState<string>("all"); // "all" atau "YYYY-MM-DD"
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const targets = useMemo(
    () =>
      calculateIndividualTargets({
        weightKg: Number(weightKg) || 65,
        heightCm: Number(heightCm) || 170,
        age: Number(age) || 25,
        sex,
        activity,
        goal,
      }),
    [weightKg, heightCm, age, sex, activity, goal]
  );

  useEffect(() => {
    onTargetsCalculated?.({
      dailyCalories: targets.dailyCalories,
      waterMl: targets.waterMl,
      proteinGrams: targets.proteinGrams,
      carbsGrams: targets.carbsGrams,
      fatsGrams: targets.fatsGrams,
    });
  }, [targets, onTargetsCalculated]);

  async function loadHistory() {
    const { data } = await supabase
      .from("body_progress")
      .select("id, weight_kg, height_cm, bmi, notes, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (data) {
      setHistory(data as BodyProgressRow[]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // Pantau pergantian hari (jam 00:00 waktu lokal) agar filter "Hari Ini" / "Kemarin" ikut terbarui otomatis
  useEffect(() => {
    const syncDay = () => {
      const currentKey = getLocalDateKey();
      setTodayKey((prev) => (prev === currentKey ? prev : currentKey));
    };

    syncDay();
    const interval = window.setInterval(syncDay, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        syncDay();
        loadHistory();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const yesterdayKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  }, [todayKey]);

  const filteredHistory = useMemo(() => {
    if (selectedDate === "all") return history;
    return history.filter((row) => getRecordedDateKey(row.recorded_at) === selectedDate);
  }, [history, selectedDate]);

  async function handleSaveProgress(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg("");

    const w = Number(weightKg) || 65;
    const h = Number(heightCm) || 170;
    const currentDateKey = getLocalDateKey();
    const finalNotes =
      notes.trim() || `${goal} • Target ${targets.dailyCalories} kcal/day`;

    // Cek apakah sudah ada catatan pada tanggal hari ini agar bisa diperbarui tanpa duplikasi ganda
    const { data: existingToday } = await supabase
      .from("body_progress")
      .select("id, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(10);

    const matchTodayRow = (existingToday as BodyProgressRow[] | null)?.find(
      (item) => getRecordedDateKey(item.recorded_at) === currentDateKey
    );

    let error = null;

    if (matchTodayRow) {
      const res = await supabase
        .from("body_progress")
        .update({
          weight_kg: w,
          height_cm: h,
          bmi: targets.bmi,
          notes: finalNotes,
        })
        .eq("id", matchTodayRow.id);
      error = res.error;
    } else {
      const res = await supabase.from("body_progress").insert({
        weight_kg: w,
        height_cm: h,
        bmi: targets.bmi,
        notes: finalNotes,
        recorded_at: currentDateKey,
      });
      error = res.error;
    }

    if (!error) {
      setTodayKey(currentDateKey);
      setNotes("");
      setStatusMsg(
        isId
          ? `Progres tersimpan (${currentDateKey})! Target harian Anda: ${targets.dailyCalories} kcal.`
          : `Progress saved (${currentDateKey})! Your daily target: ${targets.dailyCalories} kcal.`
      );
      await loadHistory();
    } else {
      setStatusMsg(error.message);
    }

    setIsSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          {isId ? "Body Progress & Target Diet" : "Body Progress & Diet Target"}
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          {isId
            ? "Hitung BMI, BMR/TDEE, dan target kalori defisit aman sesuai kondisi tubuh Anda."
            : "Calculate BMI, BMR/TDEE, and safe calorie targets tailored to your body."}
        </p>
      </div>

      {/* Kartu Target Kalori & BMI Personal */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#9EF01A] uppercase">
              {isId ? "Target Kalori Harian Anda" : "Your Daily Calorie Target"}
            </p>
            <p className="text-3xl font-extrabold text-white mt-0.5">
              {targets.dailyCalories.toLocaleString()}{" "}
              <span className="text-xs font-normal text-neutral-400">kcal</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              BMR: {targets.bmr} kcal • TDEE: {targets.tdee} kcal
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#9EF01A]/15 text-[#9EF01A]">
              BMI {targets.bmi}
            </span>
            <p className="text-[11px] text-neutral-300 mt-1">
              {isId ? targets.bmiCategoryId : targets.bmiCategoryEn}
            </p>
          </div>
        </div>

        {/* Estimasi Perubahan BB per Minggu */}
        <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
          <span className="text-neutral-400">
            {isId ? "Estimasi perubahan / minggu:" : "Est. weekly change:"}
          </span>
          <span className="font-bold text-[#9EF01A]">
            {targets.weeklyWeightChangeKg > 0
              ? `+${targets.weeklyWeightChangeKg} kg/wk`
              : `${targets.weeklyWeightChangeKg} kg/wk`}{" "}
            ({targets.calorieDiff >= 0 ? `+${targets.calorieDiff}` : targets.calorieDiff} kcal/d)
          </span>
        </div>

        {/* Rekomendasi Makro & Air */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">Protein</p>
            <p className="text-xs font-bold text-[#9EF01A]">{targets.proteinGrams}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Karbo" : "Carbs"}</p>
            <p className="text-xs font-bold text-white">{targets.carbsGrams}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Lemak" : "Fats"}</p>
            <p className="text-xs font-bold text-white">{targets.fatsGrams}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Air" : "Water"}</p>
            <p className="text-xs font-bold text-white">{targets.waterMl}ml</p>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          {isId ? targets.safetyNoteId : targets.safetyNoteEn}
        </p>
      </div>

      {/* Form Data Individu & Catat Progres */}
      <form
        onSubmit={handleSaveProgress}
        className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3"
      >
        <p className="text-xs font-bold text-[#9EF01A] uppercase">
          {isId ? "Data Tubuh & Tujuan" : "Body Metrics & Goal"}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Berat (kg)" : "Weight (kg)"}
            </label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Tinggi (cm)" : "Height (cm)"}
            </label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Usia (thn)" : "Age (yrs)"}
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Gender" : "Sex"}
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2 py-2 text-xs text-white"
            >
              <option value="male">{isId ? "Pria" : "Male"}</option>
              <option value="female">{isId ? "Wanita" : "Female"}</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Aktivitas" : "Activity"}
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2 py-2 text-xs text-white"
            >
              <option value="sedentary">{isId ? "Jarang gerak" : "Sedentary"}</option>
              <option value="light">{isId ? "Ringan (1-3x)" : "Light (1-3x)"}</option>
              <option value="moderate">{isId ? "Sedang (3-5x)" : "Moderate (3-5x)"}</option>
              <option value="active">{isId ? "Aktif (6-7x)" : "Active (6-7x)"}</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Tujuan" : "Goal"}
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as FitnessGoal)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2 py-2 text-xs text-white"
            >
              <option value="lose_fat">{isId ? "Turun BB" : "Lose Weight"}</option>
              <option value="maintain">{isId ? "Jaga BB" : "Maintain"}</option>
              <option value="build_muscle">{isId ? "Naik Otot" : "Gain Muscle"}</option>
            </select>
          </div>
        </div>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            isId
              ? "Catatan (opsional, misal: minggu ke-2 diet defisit)"
              : "Notes (optional, e.g. week 2 deficit)"
          }
          className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500"
        />

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 transition cursor-pointer disabled:opacity-50"
        >
          {isSaving
            ? isId
              ? "Menyimpan..."
              : "Saving..."
            : isId
            ? "+ Simpan Progres & Target"
            : "+ Save Progress & Target"}
        </button>

        {statusMsg && <p className="text-xs text-[#9EF01A] font-medium">{statusMsg}</p>}
      </form>

      {/* Riwayat Progres & Filter Tanggal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {isId ? "Riwayat Berat & BMI" : "Weight & BMI History"}
          </h3>
          <span className="text-[11px] text-neutral-400">
            {isId ? `Hari ini: ${todayKey}` : `Today: ${todayKey}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDate("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
              selectedDate === "all"
                ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                : "bg-[#161A18] text-neutral-300 border-white/10 hover:border-[#9EF01A]/60"
            }`}
          >
            {isId ? "Semua" : "All"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(todayKey)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
              selectedDate === todayKey
                ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                : "bg-[#161A18] text-neutral-300 border-white/10 hover:border-[#9EF01A]/60"
            }`}
          >
            {isId ? "Hari Ini" : "Today"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayKey)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
              selectedDate === yesterdayKey
                ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                : "bg-[#161A18] text-neutral-300 border-white/10 hover:border-[#9EF01A]/60"
            }`}
          >
            {isId ? "Kemarin" : "Yesterday"}
          </button>

          <input
            type="date"
            value={selectedDate === "all" ? "" : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || "all")}
            aria-label={isId ? "Pilih tanggal riwayat progres" : "Select progress history date"}
            className="bg-[#161A18] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white"
          />
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-xs text-neutral-500">
            {selectedDate === "all"
              ? isId
                ? "Belum ada riwayat progres tersimpan."
                : "No body progress logged yet."
              : isId
              ? "Tidak ada riwayat progres pada tanggal ini."
              : "No body progress logged for this date."}
          </p>
        ) : (
          filteredHistory.map((row) => {
            const recDate = getRecordedDateKey(row.recorded_at);
            return (
              <div
                key={row.id}
                className="bg-[#161A18] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold">
                    {row.weight_kg} kg • {row.height_cm} cm
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {row.notes || "-"}
                    {recDate ? ` • ${recDate}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#9EF01A]">BMI {row.bmi}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}