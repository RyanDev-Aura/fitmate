"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/lib/i18n";
import {
  getTrialDaysLeft,
  loadSubscriptionState,
  PlanTier,
  resetTodayAiUsageCount,
  saveSubscriptionState,
  SubscriptionState,
} from "@/lib/subscription";

export type UserProfileSettings = {
  displayName: string;
  goalLabel: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
  wearableSource: "manual" | "health_connect" | "apple_health";
};

type ProfileTabProps = {
  lang: Lang;
  onChangeLang: (nextLang: Lang) => void;
  targets: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  };
  onApplyTargets: (next: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    waterMl: number;
  }) => void;
  onSubscriptionChange?: (nextSub: SubscriptionState) => void;
};

const STORAGE_KEY = "fitmate_profile_settings_v1";

export default function ProfileTab({
  lang,
  onChangeLang,
  targets,
  onApplyTargets,
  onSubscriptionChange,
}: ProfileTabProps) {
  const isId = lang === "id";

  const [displayName, setDisplayName] = useState("Atlet FitMate");
  const [goalLabel, setGoalLabel] = useState(
    isId ? "Turun BB & Jaga Otot" : "Fat Loss & Muscle Retention"
  );
  const [calorieInput, setCalorieInput] = useState(String(targets.dailyCalories));
  const [proteinInput, setProteinInput] = useState(String(targets.proteinGrams));
  const [carbsInput, setCarbsInput] = useState(String(targets.carbsGrams));
  const [fatsInput, setFatsInput] = useState(String(targets.fatsGrams));
  const [waterInput, setWaterInput] = useState(String(targets.waterMl));
  const [wearableSource, setWearableSource] =
    useState<UserProfileSettings["wearableSource"]>("manual");
  const [savedMsg, setSavedMsg] = useState("");
  const [subState, setSubState] = useState<SubscriptionState>(() =>
    loadSubscriptionState()
  );

  useEffect(() => {
    setCalorieInput(String(targets.dailyCalories));
    setProteinInput(String(targets.proteinGrams));
    setCarbsInput(String(targets.carbsGrams));
    setFatsInput(String(targets.fatsGrams));
    setWaterInput(String(targets.waterMl));
  }, [targets]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfileSettings>;
        if (parsed.displayName) setDisplayName(parsed.displayName);
        if (parsed.goalLabel) setGoalLabel(parsed.goalLabel);
        if (parsed.wearableSource) setWearableSource(parsed.wearableSource);
      }
    } catch {
      // Abaikan jika storage tidak tersedia
    }
    const loadedSub = loadSubscriptionState();
    setSubState(loadedSub);
    onSubscriptionChange?.(loadedSub);
  }, [onSubscriptionChange]);

  function handleSelectTier(nextTier: PlanTier) {
    const updated: SubscriptionState = {
      ...subState,
      tier: nextTier,
      trialStartedAt:
        nextTier === "trial" ? new Date().toISOString() : subState.trialStartedAt,
    };
    setSubState(updated);
    saveSubscriptionState(updated);
    onSubscriptionChange?.(updated);
    setSavedMsg(
      nextTier === "pro"
        ? isId
          ? "Mode PRO diaktifkan (simulasi testing). Semua fitur lanjutan terbuka!"
          : "PRO mode enabled (testing simulation). All advanced features unlocked!"
        : isId
        ? `Mode UJI COBA (${updated.trialDays} hari) aktif dengan batas ${updated.dailyAiLimitTrial} chat AI/hari.`
        : `TRIAL mode (${updated.trialDays} days) active with ${updated.dailyAiLimitTrial} AI chats/day.`
    );
  }

  function handleResetTrialQuota() {
    resetTodayAiUsageCount();
    setSavedMsg(
      isId
        ? "Kuota chat Uji Coba hari ini berhasil direset ke penuh."
        : "Today's Trial AI chat quota has been reset."
    );
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const nextCalories = Math.max(800, Number(calorieInput) || targets.dailyCalories);
    const nextProtein = Math.max(20, Number(proteinInput) || targets.proteinGrams);
    const nextCarbs = Math.max(20, Number(carbsInput) || targets.carbsGrams);
    const nextFats = Math.max(15, Number(fatsInput) || targets.fatsGrams);
    const nextWater = Math.max(500, Number(waterInput) || targets.waterMl);

    const payload: UserProfileSettings = {
      displayName: displayName.trim() || (isId ? "Pengguna FitMate" : "FitMate User"),
      goalLabel: goalLabel.trim() || (isId ? "Bugar Harian" : "Daily Fitness"),
      dailyCalories: nextCalories,
      proteinGrams: nextProtein,
      carbsGrams: nextCarbs,
      fatsGrams: nextFats,
      waterMl: nextWater,
      wearableSource,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Abaikan jika storage tidak tersedia
    }

    onApplyTargets({
      dailyCalories: nextCalories,
      proteinGrams: nextProtein,
      carbsGrams: nextCarbs,
      fatsGrams: nextFats,
      waterMl: nextWater,
    });

    setSavedMsg(
      isId
        ? "Pengaturan profil & target harian berhasil disimpan!"
        : "Profile & daily targets saved!"
    );
  }

  const isPro = subState.tier === "pro";
  const daysLeft = getTrialDaysLeft(subState);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          {isId ? "Profil & Pengaturan" : "Profile & Settings"}
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          {isId
            ? "Atur identitas, status Uji Coba/Pro, target harian aktif, dan preferensi sinkronisasi."
            : "Manage your profile, Trial/Pro status, active daily targets, and sync preferences."}
        </p>
      </div>

      {/* Kartu Paket Uji Coba vs Pro */}
      <div className="bg-[#161A18] border border-[#9EF01A]/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9EF01A]">
              {isId ? "Status Langganan" : "Subscription Status"}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {isPro
                ? isId
                  ? "FitMate PRO Aktif"
                  : "FitMate PRO Active"
                : isId
                ? `Mode Uji Coba (${daysLeft} hari tersisa)`
                : `Trial Mode (${daysLeft} days left)`}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isPro
                ? "bg-[#9EF01A] text-black"
                : "bg-[#9EF01A]/15 text-[#9EF01A]"
            }`}
          >
            {isPro ? "PRO" : "TRIAL"}
          </span>
        </div>

        <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3 space-y-1 text-[11px] text-neutral-300">
          <p>
            <span className="text-white font-semibold">
              {isId ? "Uji Coba:" : "Trial:"}
            </span>{" "}
            {isId
              ? `Log nutrisi & hidrasi harian, target dasar, serta ${subState.dailyAiLimitTrial} chat Pelatih AI/hari.`
              : `Daily nutrition & hydration logs, basic targets, and ${subState.dailyAiLimitTrial} AI Coach chats/day.`}
          </p>
          <p>
            <span className="text-[#9EF01A] font-semibold">PRO:</span>{" "}
            {isId
              ? "Chat Pelatih AI tanpa batas harian, Hybrid Workout Planner AI penuh, dan sinkronisasi aktivitas/jam pintar."
              : "Unlimited daily AI Coach chats, full AI Hybrid Workout Planner, and activity/wearable sync."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSelectTier("trial")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
              !isPro
                ? "bg-[#9EF01A]/20 text-[#9EF01A] border-[#9EF01A]"
                : "bg-[#0B0D0C] text-neutral-300 border-white/15 hover:border-white/30"
            }`}
          >
            {isId ? "Mode Uji Coba" : "Trial Mode"}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTier("pro")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isPro
                ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                : "bg-[#9EF01A] text-black border-[#9EF01A] hover:brightness-105"
            }`}
          >
            {isPro
              ? isId
                ? "PRO Sudah Aktif"
                : "PRO Active"
              : isId
              ? "Aktifkan PRO"
              : "Activate PRO"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetTrialQuota}
          className="w-full py-2 rounded-xl bg-[#0B0D0C] border border-white/10 text-[11px] font-semibold text-neutral-300 hover:border-white/25 transition cursor-pointer"
        >
          {isId
            ? "Reset Kuota Chat Uji Coba Hari Ini (Testing)"
            : "Reset Today's Trial Chat Quota (Testing)"}
        </button>
      </div>

      {/* Kartu Ringkasan Profil */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">{displayName}</p>
            <p className="text-xs text-[#9EF01A] mt-0.5">{goalLabel}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#9EF01A]/15 text-[#9EF01A]">
            {lang.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Kalori" : "Calories"}</p>
            <p className="text-xs font-bold text-[#9EF01A]">
              {targets.dailyCalories.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">Protein</p>
            <p className="text-xs font-bold text-white">{targets.proteinGrams}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Karbo" : "Carbs"}</p>
            <p className="text-xs font-bold text-white">{targets.carbsGrams}g</p>
          </div>
          <div className="bg-[#0B0D0C] border border-white/10 rounded-xl py-2 px-1">
            <p className="text-[10px] text-neutral-400">{isId ? "Air" : "Water"}</p>
            <p className="text-xs font-bold text-white">{targets.waterMl}ml</p>
          </div>
        </div>
      </div>

      {/* Form Pengaturan Profil & Target */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3"
      >
        <p className="text-xs font-bold text-[#9EF01A] uppercase">
          {isId ? "Preferensi & Target Aktif" : "Preferences & Active Targets"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Nama Panggilan" : "Display Name"}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Fokus Tujuan" : "Primary Focus"}
            </label>
            <input
              type="text"
              value={goalLabel}
              onChange={(e) => setGoalLabel(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Target Kalori (kcal)" : "Calorie Target (kcal)"}
            </label>
            <input
              type="number"
              value={calorieInput}
              onChange={(e) => setCalorieInput(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Target Air (ml)" : "Water Target (ml)"}
            </label>
            <input
              type="number"
              value={waterInput}
              onChange={(e) => setWaterInput(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">Protein (g)</label>
            <input
              type="number"
              value={proteinInput}
              onChange={(e) => setProteinInput(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Karbo (g)" : "Carbs (g)"}
            </label>
            <input
              type="number"
              value={carbsInput}
              onChange={(e) => setCarbsInput(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Lemak (g)" : "Fats (g)"}
            </label>
            <input
              type="number"
              value={fatsInput}
              onChange={(e) => setFatsInput(e.target.value)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Bahasa Aplikasi" : "App Language"}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeLang("id")}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  lang === "id"
                    ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                    : "bg-[#0B0D0C] text-neutral-300 border-white/15"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => onChangeLang("en")}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  lang === "en"
                    ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                    : "bg-[#0B0D0C] text-neutral-300 border-white/15"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-neutral-400 mb-1">
              {isId ? "Sumber Aktivitas / Jam" : "Activity / Wearable Source"}
            </label>
            <select
              value={wearableSource}
              onChange={(e) =>
                setWearableSource(e.target.value as UserProfileSettings["wearableSource"])
              }
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
            >
              <option value="manual">
                {isId ? "Input Manual / Aplikasi" : "Manual / In-App"}
              </option>
              <option value="health_connect">Health Connect (Android)</option>
              <option value="apple_health">Apple Health (iOS)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 transition cursor-pointer"
        >
          {isId ? "Simpan Pengaturan Profil" : "Save Profile Settings"}
        </button>

        {savedMsg && <p className="text-xs text-[#9EF01A] font-medium">{savedMsg}</p>}
      </form>

      {/* Info Kesiapan Mobile & Wearable */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-1.5">
        <p className="text-xs font-bold text-white">
          {isId ? "Kesiapan Mobile & Sinkronisasi" : "Mobile & Sync Readiness"}
        </p>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          {isId
            ? "Tata letak dirancang untuk layar mobile, siap dibungkus Capacitor dan dihubungkan dengan data aktivitas/jam pintar pada tahap berikutnya."
            : "Designed for mobile viewports, ready for Capacitor wrapping and wearable activity integration in upcoming steps."}
        </p>
      </div>
    </div>
  );
}