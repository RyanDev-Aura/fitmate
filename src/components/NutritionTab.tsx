"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Lang } from "@/lib/i18n";
import {
  calcCaloriesFromMacros,
  computeNutritionByGrams,
  FOOD_PRESETS,
  matchFoodPreset,
} from "@/lib/nutritionData";

type NutritionLog = {
  id: string;
  entry_type: "meal" | "water";
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_ml: number;
  logged_date: string;
  created_at?: string;
};

type NutritionTabProps = {
  lang: Lang;
  calorieTarget?: number;
  waterTarget?: number;
};

const PORTION_MULTIPLIERS = [0.5, 1, 1.5, 2];

function getLocalDateKey(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD waktu lokal perangkat
}

function getLogDateKey(item: NutritionLog): string {
  if (item.logged_date) {
    const raw = item.logged_date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = getLocalDateKey(raw);
    if (parsed) return parsed;
  }
  if (item.created_at) {
    return getLocalDateKey(item.created_at);
  }
  return "";
}

export default function NutritionTab({
  lang,
  calorieTarget = 2500,
  waterTarget = 2500,
}: NutritionTabProps) {
  const isId = lang === "id";

  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [todayKey, setTodayKey] = useState<string>(() => getLocalDateKey());
  const [selectedDate, setSelectedDate] = useState<string>("all"); // "all" atau "YYYY-MM-DD"
  const [mealTitle, setMealTitle] = useState("");
  const [grams, setGrams] = useState("150");
  const [baseGrams, setBaseGrams] = useState<number>(150);
  const [calories, setCalories] = useState("0");
  const [protein, setProtein] = useState("0");
  const [carbs, setCarbs] = useState("0");
  const [fats, setFats] = useState("0");
  const [autoAtwater, setAutoAtwater] = useState(true);
  const [matchedLabel, setMatchedLabel] = useState<string | null>(null);
  const [servingHint, setServingHint] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function loadLogs() {
    const { data } = await supabase
      .from("nutrition_logs")
      .select(
        "id, entry_type, title, calories, protein_g, carbs_g, fats_g, water_ml, logged_date, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data as NutritionLog[]);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  // Pantau pergantian hari (jam 00:00 waktu lokal) agar target & hidrasi reset otomatis
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
        loadLogs();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const activePreset = useMemo(() => matchFoodPreset(mealTitle), [mealTitle]);

  function applyPresetCalculation(
    preset: NonNullable<ReturnType<typeof matchFoodPreset>>,
    targetGrams: number
  ) {
    const calc = computeNutritionByGrams(preset, targetGrams);
    const pStr = String(calc.protein_g);
    const cStr = String(calc.carbs_g);
    const fStr = String(calc.fats_g);

    setMatchedLabel(isId ? preset.label_id : preset.label_en);
    setServingHint(
      isId
        ? `Standar 1 porsi: ${preset.defaultGrams}g`
        : `Standard 1 serving: ${preset.defaultGrams}g`
    );
    setProtein(pStr);
    setCarbs(cStr);
    setFats(fStr);
    setCalories(
      autoAtwater
        ? String(calcCaloriesFromMacros(calc.protein_g, calc.carbs_g, calc.fats_g))
        : String(calc.calories)
    );
  }

  function handleTitleChange(val: string) {
    setMealTitle(val);
    const preset = matchFoodPreset(val);

    if (preset) {
      const defaultG = preset.defaultGrams || 100;
      setBaseGrams(defaultG);
      setGrams(String(defaultG));
      applyPresetCalculation(preset, defaultG);
    } else {
      setMatchedLabel(null);
      setServingHint(null);
    }
  }

  function handleGramsChange(val: string) {
    setGrams(val);
    const numGrams = Math.max(0, Number(val) || 0);
    const preset = matchFoodPreset(mealTitle);

    if (preset) {
      applyPresetCalculation(preset, numGrams);
    } else if (baseGrams > 0 && numGrams > 0) {
      const ratio = numGrams / baseGrams;
      const nextP = Math.round((Number(protein) || 0) * ratio * 10) / 10;
      const nextC = Math.round((Number(carbs) || 0) * ratio * 10) / 10;
      const nextF = Math.round((Number(fats) || 0) * ratio * 10) / 10;

      setProtein(String(nextP));
      setCarbs(String(nextC));
      setFats(String(nextF));
      if (autoAtwater) {
        setCalories(String(calcCaloriesFromMacros(nextP, nextC, nextF)));
      }
      setBaseGrams(numGrams);
    }
  }

  function handleMultiplierClick(mult: number) {
    const preset = matchFoodPreset(mealTitle);
    const referenceGrams = preset ? preset.defaultGrams || 100 : baseGrams || 100;
    const nextGrams = Math.round(referenceGrams * mult);
    setGrams(String(nextGrams));

    if (preset) {
      applyPresetCalculation(preset, nextGrams);
    } else {
      const ratio = referenceGrams > 0 ? nextGrams / referenceGrams : 1;
      const nextP = Math.round((Number(protein) || 0) * ratio * 10) / 10;
      const nextC = Math.round((Number(carbs) || 0) * ratio * 10) / 10;
      const nextF = Math.round((Number(fats) || 0) * ratio * 10) / 10;
      setProtein(String(nextP));
      setCarbs(String(nextC));
      setFats(String(nextF));
      if (autoAtwater) {
        setCalories(String(calcCaloriesFromMacros(nextP, nextC, nextF)));
      }
      setBaseGrams(nextGrams);
    }
  }

  function handleMacroChange(field: "p" | "c" | "f", val: string) {
    const nextP = field === "p" ? val : protein;
    const nextC = field === "c" ? val : carbs;
    const nextF = field === "f" ? val : fats;

    if (field === "p") setProtein(val);
    if (field === "c") setCarbs(val);
    if (field === "f") setFats(val);

    const currentG = Number(grams) || 100;
    setBaseGrams(currentG);

    if (autoAtwater) {
      const total = calcCaloriesFromMacros(
        Number(nextP) || 0,
        Number(nextC) || 0,
        Number(nextF) || 0
      );
      setCalories(String(total));
    }
  }

  function handleSelectChip(presetId: string) {
    const preset = FOOD_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const title = isId ? preset.label_id : preset.label_en;
    const defaultG = preset.defaultGrams || 100;
    setMealTitle(title);
    setBaseGrams(defaultG);
    setGrams(String(defaultG));
    applyPresetCalculation(preset, defaultG);
  }

  async function handleAddMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!mealTitle.trim()) return;

    setIsSaving(true);
    setStatusMsg("");

    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fats) || 0;
    const finalCalories = autoAtwater
      ? calcCaloriesFromMacros(p, c, f)
      : Number(calories) || 0;

    const gVal = Number(grams) || 0;
    const displayTitle = gVal > 0 ? `${mealTitle.trim()} (${gVal}g)` : mealTitle.trim();
    const currentDateKey = getLocalDateKey();

    const { error } = await supabase.from("nutrition_logs").insert({
      entry_type: "meal",
      title: displayTitle,
      calories: finalCalories,
      protein_g: p,
      carbs_g: c,
      fats_g: f,
      water_ml: 0,
      logged_date: currentDateKey,
    });

    if (!error) {
      setTodayKey(currentDateKey);
      setMealTitle("");
      setGrams("150");
      setBaseGrams(150);
      setCalories("0");
      setProtein("0");
      setCarbs("0");
      setFats("0");
      setMatchedLabel(null);
      setServingHint(null);
      setStatusMsg(
        isId
          ? `Tersimpan (${finalCalories} kcal sesuai standar makro)!`
          : `Saved (${finalCalories} kcal by macro standard)!`
      );
      await loadLogs();
    } else {
      setStatusMsg(error.message);
    }

    setIsSaving(false);
  }

  async function handleAddWater(ml: number) {
    setStatusMsg("");
    const currentDateKey = getLocalDateKey();
    const { error } = await supabase.from("nutrition_logs").insert({
      entry_type: "water",
      title: isId ? `Air Putih (${ml} ml)` : `Water (${ml} ml)`,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
      water_ml: ml,
      logged_date: currentDateKey,
    });

    if (!error) {
      setTodayKey(currentDateKey);
      setStatusMsg(isId ? `+${ml} ml air minum tercatat!` : `+${ml} ml water logged!`);
      await loadLogs();
    }
  }

  const todayLogs = useMemo(
    () => logs.filter((item) => getLogDateKey(item) === todayKey),
    [logs, todayKey]
  );

  const yesterdayKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  }, [todayKey]);

  const filteredHistoryLogs = useMemo(() => {
    if (selectedDate === "all") return logs;
    return logs.filter((item) => getLogDateKey(item) === selectedDate);
  }, [logs, selectedDate]);

  const historySummary = useMemo(() => {
    const calories = filteredHistoryLogs.reduce(
      (acc, item) => acc + (item.calories || 0),
      0
    );
    const water = filteredHistoryLogs.reduce(
      (acc, item) => acc + (item.water_ml || 0),
      0
    );
    return { calories, water };
  }, [filteredHistoryLogs]);

  const totalCalories = todayLogs.reduce((acc, item) => acc + (item.calories || 0), 0);
  const totalProtein = todayLogs.reduce((acc, item) => acc + (item.protein_g || 0), 0);
  const totalCarbs = todayLogs.reduce((acc, item) => acc + (item.carbs_g || 0), 0);
  const totalFats = todayLogs.reduce((acc, item) => acc + (item.fats_g || 0), 0);
  const totalWater = todayLogs.reduce((acc, item) => acc + (item.water_ml || 0), 0);
  const waterPercent = Math.min(100, Math.round((totalWater / waterTarget) * 100));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          {isId ? "Nutrisi & Hidrasi" : "Nutrition & Hydration"}
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          {isId
            ? "Auto-fill porsi standar, skala porsi real-time, Atwater, reset otomatis harian jam 00:00, dan riwayat per tanggal."
            : "Standard portion auto-fill, real-time serving scaling, Atwater, daily 00:00 reset, and date history."}
        </p>
      </div>

      {/* Ringkasan Kalori & Makro */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-neutral-400">
              {isId ? "Kalori Tercatat Hari Ini" : "Logged Calories Today"}
            </p>
            <p className="text-2xl font-extrabold text-white mt-0.5">
              {totalCalories.toLocaleString()}{" "}
              <span className="text-xs font-normal text-neutral-400">
                / {calorieTarget.toLocaleString()} kcal
              </span>
            </p>
          </div>
          <span className="text-xs font-bold text-[#9EF01A]">
            {Math.max(0, calorieTarget - totalCalories)} kcal {isId ? "sisa" : "left"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2">
            <p className="text-[11px] text-neutral-400">Protein</p>
            <p className="text-sm font-bold text-[#9EF01A]">{totalProtein}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2">
            <p className="text-[11px] text-neutral-400">{isId ? "Karbo" : "Carbs"}</p>
            <p className="text-sm font-bold text-white">{totalCarbs}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2">
            <p className="text-[11px] text-neutral-400">{isId ? "Lemak" : "Fats"}</p>
            <p className="text-sm font-bold text-white">{totalFats}g</p>
          </div>
        </div>
      </div>

      {/* Hydration Tracker */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#9EF01A] uppercase">
              {isId ? "Hidrasi Harian" : "Daily Hydration"}
            </p>
            <p className="text-lg font-bold mt-0.5">
              {totalWater} / {waterTarget} ml ({waterPercent}%)
            </p>
          </div>
          <span className="text-[11px] text-neutral-400">
            {isId ? "Reset 00:00" : "Resets 00:00"}
          </span>
        </div>

        <div className="w-full h-2 bg-[#0B0D0C] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9EF01A] transition-all"
            style={{ width: `${waterPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => handleAddWater(ml)}
              className="py-2 rounded-xl bg-[#0B0D0C] border border-white/15 text-xs font-semibold hover:border-[#9EF01A] transition cursor-pointer"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </div>

      {/* Form Input Makanan */}
      <form
        onSubmit={handleAddMeal}
        className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#9EF01A] uppercase">
            {isId ? "Tambah Catatan Makanan" : "Add Meal Log"}
          </p>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAtwater}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoAtwater(checked);
                if (checked) {
                  setCalories(
                    String(
                      calcCaloriesFromMacros(
                        Number(protein) || 0,
                        Number(carbs) || 0,
                        Number(fats) || 0
                      )
                    )
                  );
                } else if (activePreset) {
                  const calc = computeNutritionByGrams(
                    activePreset,
                    Number(grams) || activePreset.defaultGrams
                  );
                  setCalories(String(calc.calories));
                }
              }}
              className="accent-[#9EF01A]"
            />
            {isId ? "Hitung otomatis (Atwater)" : "Auto Atwater"}
          </label>
        </div>

        {/* Pilihan Cepat Makanan */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FOOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectChip(preset.id)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#0B0D0C] border border-white/10 text-[11px] text-neutral-300 hover:border-[#9EF01A]/60 transition cursor-pointer"
            >
              {isId ? preset.label_id : preset.label_en}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={mealTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={
              isId
                ? "Ketik nama makanan / manual..."
                : "Type food name / manual..."
            }
            className="col-span-2 bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-500"
          />
          <div>
            <input
              type="number"
              min="0"
              value={grams}
              onChange={(e) => handleGramsChange(e.target.value)}
              placeholder="Gram"
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
            />
            <span className="block text-[10px] text-neutral-400 mt-0.5 text-right">
              {isId ? "Porsi (g)" : "Portion (g)"}
            </span>
          </div>
        </div>

        {/* Pengali Porsi Cepat */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[11px] text-neutral-400">
            {isId ? "Skala porsi cepat:" : "Quick portion scale:"}
          </span>
          <div className="flex items-center gap-1.5">
            {PORTION_MULTIPLIERS.map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => handleMultiplierClick(mult)}
                className="px-2.5 py-1 rounded-lg bg-[#0B0D0C] border border-white/15 text-[11px] font-semibold text-neutral-200 hover:border-[#9EF01A] hover:text-[#9EF01A] transition cursor-pointer"
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {matchedLabel && (
          <div className="text-[11px] text-[#9EF01A] flex flex-wrap items-center justify-between gap-1">
            <span>
              {isId ? "Referensi gizi cocok:" : "Matched nutrition reference:"} {matchedLabel}
            </span>
            {servingHint && <span className="text-neutral-400">{servingHint}</span>}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">kcal</label>
            <input
              type="number"
              value={calories}
              readOnly={autoAtwater}
              onChange={(e) => setCalories(e.target.value)}
              className={`w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs ${
                autoAtwater ? "text-[#9EF01A] font-bold" : "text-white"
              }`}
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Protein (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={protein}
              onChange={(e) => handleMacroChange("p", e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Carbs (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={carbs}
              onChange={(e) => handleMacroChange("c", e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Fats (g)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={fats}
              onChange={(e) => handleMacroChange("f", e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
        </div>

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
            ? "+ Simpan Makanan"
            : "+ Save Meal"}
        </button>

        {statusMsg && <p className="text-xs text-[#9EF01A] font-medium">{statusMsg}</p>}
      </form>

      {/* Riwayat Log & Filter Tanggal */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {isId ? "Riwayat Catatan" : "Recent Logs"}
          </h3>
          {selectedDate !== "all" && (
            <span className="text-[11px] text-[#9EF01A] font-medium">
              {historySummary.calories} kcal • {historySummary.water} ml
            </span>
          )}
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
            aria-label={isId ? "Pilih tanggal riwayat" : "Select history date"}
            className="bg-[#161A18] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white"
          />
        </div>

        {filteredHistoryLogs.length === 0 ? (
          <p className="text-xs text-neutral-500">
            {isId
              ? "Tidak ada catatan nutrisi atau air pada tanggal ini."
              : "No nutrition or water logs for this date."}
          </p>
        ) : (
          filteredHistoryLogs.map((item) => {
            const logDate = getLogDateKey(item);
            return (
              <div
                key={item.id}
                className="bg-[#161A18] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-[11px] text-neutral-400">
                    {item.entry_type === "water"
                      ? `${item.water_ml} ml`
                      : `P: ${item.protein_g}g • C: ${item.carbs_g}g • F: ${item.fats_g}g`}
                    {logDate ? ` • ${logDate}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#9EF01A]">
                  {item.entry_type === "water" ? `+${item.water_ml} ml` : `${item.calories} kcal`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}