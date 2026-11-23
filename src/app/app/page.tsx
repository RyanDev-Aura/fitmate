"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { dictionary, Lang } from "@/lib/i18n";
import {
  getDefaultSubscription,
  loadSubscriptionState,
  SubscriptionState,
} from "@/lib/subscription";
import {
  calculateMemberTargets,
  MemberProfileRecord,
  WorkoutFocusType,
} from "@/lib/member-profile";
import MemberOnboardingGate from "@/components/MemberOnboardingGate";
import WorkoutTab from "@/components/WorkoutTab";
import NutritionTab from "@/components/NutritionTab";
import ProgressTab from "@/components/ProgressTab";
import AiCoachTab from "@/components/AiCoachTab";
import ProfileTab, { UserProfileSettings } from "@/components/ProfileTab";
import DietProgressFollowUp from "@/components/DietProgressFollowUp";
import type { BodyProgressLog } from "@/lib/progressAnalytics";

type WorkoutPlan = {
  id: string;
  title_en: string;
  title_id: string;
  planner_mode: string;
  estimated_minutes: number;
};

type Exercise = {
  id: string;
  name_en: string;
  name_id: string;
  muscle_group: string;
  default_sets: number;
  default_reps: number;
};

const PROFILE_STORAGE_KEY = "fitmate_profile_settings_v1";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(num) ? num : 0);
}

function getLocalDateKey(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartOfWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return getLocalDateKey(monday);
}

function getTimeGreeting(lang: Lang, hour: number): string {
  if (lang === "id") {
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function writeLegacyProfileCache(
  profile: MemberProfileRecord,
  targets: {
    dailyCalories: number;
    waterMl: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  }
) {
  if (typeof window === "undefined") return;
  try {
    const existingRaw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const merged = {
      ...existing,
      displayName: profile.display_name || profile.full_name,
      fullName: profile.full_name,
      email: profile.email,
      whatsappPhone: profile.whatsapp_phone,
      socialPlatform: profile.social_platform,
      socialHandle: profile.social_handle,
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      goal: profile.goal,
      headCircumferenceCm: profile.head_circumference_cm,
      neckCircumferenceCm: profile.neck_circumference_cm,
      abdomenCircumferenceCm: profile.abdomen_circumference_cm,
      waistCircumferenceCm: profile.waist_circumference_cm,
      armCircumferenceCm: profile.arm_circumference_cm,
      dailyCalories: targets.dailyCalories,
      waterMl: targets.waterMl,
      proteinGrams: targets.proteinGrams,
      carbsGrams: targets.carbsGrams,
      fatsGrams: targets.fatsGrams,
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

interface AuthenticatedWorkspaceProps {
  memberProfile: MemberProfileRecord;
  onOpenEditProfile: () => void;
  onLogout: () => void;
}

function AuthenticatedWorkspace({
  memberProfile,
  onOpenEditProfile,
  onLogout,
}: AuthenticatedWorkspaceProps) {
  const computedFromMember = useMemo(
    () =>
      calculateMemberTargets({
        age: memberProfile.age,
        gender: memberProfile.gender,
        height_cm: memberProfile.height_cm,
        weight_kg: memberProfile.weight_kg,
        activity_level: memberProfile.activity_level,
        goal: memberProfile.goal,
        waist_circumference_cm: memberProfile.waist_circumference_cm,
        abdomen_circumference_cm: memberProfile.abdomen_circumference_cm,
      }),
    [memberProfile]
  );

  const [lang, setLang] = useState<Lang>("id");
  const [displayName, setDisplayName] = useState<string>(
    memberProfile.display_name || memberProfile.full_name || "FitMate"
  );
  const [currentHour, setCurrentHour] = useState<number>(12);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number>(
    memberProfile.daily_calories || computedFromMember.dailyCalories
  );
  const [dailyWaterTarget, setDailyWaterTarget] = useState<number>(
    memberProfile.water_ml || computedFromMember.waterMl
  );
  const [todayCalories, setTodayCalories] = useState(0);
  const [weeklyWorkoutsDone, setWeeklyWorkoutsDone] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionState>(() =>
    getDefaultSubscription()
  );
  const [macroTargets, setMacroTargets] = useState({
    proteinGrams: memberProfile.protein_grams || computedFromMember.proteinGrams,
    carbsGrams: memberProfile.carbs_grams || computedFromMember.carbsGrams,
    fatsGrams: memberProfile.fats_grams || computedFromMember.fatsGrams,
  });
  const [workoutFocusType, setWorkoutFocusType] = useState<WorkoutFocusType>(
    memberProfile.recommended_workout_mode || computedFromMember.workoutFocusType
  );
  const [activeTab, setActiveTab] = useState<
    "home" | "workout" | "nutrition" | "progress" | "coach" | "profile"
  >("home");

  // State follow-up berat badan & perubahan bentuk fisik
  const [progressLogs, setProgressLogs] = useState<BodyProgressLog[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<boolean>(false);

  const progressUserKey =
    (typeof memberProfile === "object" &&
      memberProfile &&
      "email" in memberProfile &&
      typeof memberProfile.email === "string" &&
      memberProfile.email) ||
    (typeof memberProfile === "object" &&
      memberProfile &&
      "id" in memberProfile &&
      typeof memberProfile.id === "string" &&
      memberProfile.id) ||
    "fitmate-default-user";

  const progressTargetWeight: number | null =
    typeof memberProfile === "object" &&
    memberProfile &&
    "targetWeightKg" in memberProfile &&
    typeof memberProfile.targetWeightKg === "number"
      ? memberProfile.targetWeightKg
      : typeof memberProfile === "object" &&
        memberProfile &&
        "target_weight_kg" in memberProfile &&
        typeof memberProfile.target_weight_kg === "number"
      ? memberProfile.target_weight_kg
      : null;

  const fetchProgressLogs = useCallback(async () => {
    setLoadingProgress(true);
    try {
      const { data, error } = await supabase
        .from("body_progress_logs")
        .select("*")
        .eq("user_id", progressUserKey)
        .order("recorded_date", { ascending: true });

      if (error) {
        console.error("Error mengambil body_progress_logs:", error.message);
        return;
      }

      setProgressLogs((data as BodyProgressLog[]) ?? []);
    } finally {
      setLoadingProgress(false);
    }
  }, [progressUserKey]);

  useEffect(() => {
    if (activeTab === "progress") {
      fetchProgressLogs();
    }
  }, [activeTab, fetchProgressLogs]);

  const handleSaveProgressLog = useCallback(
    async (payload: Omit<BodyProgressLog, "id" | "user_id">) => {
      const rowPayload = {
        user_id: progressUserKey,
        recorded_date: payload.recorded_date,
        weight_kg: payload.weight_kg,
        waist_cm: payload.waist_cm ?? null,
        chest_cm: payload.chest_cm ?? null,
        hip_cm: payload.hip_cm ?? null,
        arm_cm: payload.arm_cm ?? null,
        notes: payload.notes ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("body_progress_logs")
        .upsert(rowPayload, { onConflict: "user_id,recorded_date" });

      if (error) {
        throw new Error(error.message);
      }

      await fetchProgressLogs();
    },
    [progressUserKey, fetchProgressLogs]
  );

  const t = dictionary[lang];
  const weeklyWorkoutGoal = computedFromMember.weeklyWorkoutGoal;

  useEffect(() => {
    const nextTargets = {
      dailyCalories: memberProfile.daily_calories || computedFromMember.dailyCalories,
      waterMl: memberProfile.water_ml || computedFromMember.waterMl,
      proteinGrams: memberProfile.protein_grams || computedFromMember.proteinGrams,
      carbsGrams: memberProfile.carbs_grams || computedFromMember.carbsGrams,
      fatsGrams: memberProfile.fats_grams || computedFromMember.fatsGrams,
    };

    setDisplayName(memberProfile.display_name || memberProfile.full_name || "FitMate");
    setDailyCalorieTarget(nextTargets.dailyCalories);
    setDailyWaterTarget(nextTargets.waterMl);
    setMacroTargets({
      proteinGrams: nextTargets.proteinGrams,
      carbsGrams: nextTargets.carbsGrams,
      fatsGrams: nextTargets.fatsGrams,
    });
    setWorkoutFocusType(
      memberProfile.recommended_workout_mode || computedFromMember.workoutFocusType
    );
    writeLegacyProfileCache(memberProfile, nextTargets);
  }, [memberProfile, computedFromMember]);

  const handleTargetsCalculated = useCallback(
    (targets: {
      dailyCalories: number;
      waterMl: number;
      proteinGrams: number;
      carbsGrams: number;
      fatsGrams: number;
    }) => {
      setDailyCalorieTarget((prev) =>
        prev === targets.dailyCalories ? prev : targets.dailyCalories
      );
      setDailyWaterTarget((prev) =>
        prev === targets.waterMl ? prev : targets.waterMl
      );
      setMacroTargets((prev) =>
        prev.proteinGrams === targets.proteinGrams &&
        prev.carbsGrams === targets.carbsGrams &&
        prev.fatsGrams === targets.fatsGrams
          ? prev
          : {
              proteinGrams: targets.proteinGrams,
              carbsGrams: targets.carbsGrams,
              fatsGrams: targets.fatsGrams,
            }
      );
      writeLegacyProfileCache(memberProfile, targets);
    },
    [memberProfile]
  );

  const loadTodayCalories = useCallback(async () => {
    try {
      const todayKey = getLocalDateKey();
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("calories, logged_date, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return;

      const sumToday = data
        .filter((item: { logged_date?: string | null; created_at?: string | null }) => {
          const rawDate = (item.logged_date || "").trim();
          const key = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
            ? rawDate
            : getLocalDateKey(rawDate || item.created_at || "");
          return key === todayKey;
        })
        .reduce(
          (acc: number, item: { calories?: number | null }) =>
            acc + (Number(item.calories) || 0),
          0
        );

      setTodayCalories(sumToday);
    } catch {
      // Abaikan error jaringan sementara saat dev
    }
  }, []);

  const loadWeeklyWorkouts = useCallback(async () => {
    try {
      const startOfWeek = getStartOfWeekKey();
      const { data, error } = await supabase
        .from("workout_logs")
        .select("id, logged_date, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error || !data) return;

      const countThisWeek = data.filter(
        (item: { logged_date?: string | null; created_at?: string | null }) => {
          const rawDate = (item.logged_date || "").trim();
          const key = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
            ? rawDate
            : getLocalDateKey(rawDate || item.created_at || "");
          return key !== "" && key >= startOfWeek;
        }
      ).length;

      setWeeklyWorkoutsDone(countThisWeek);
    } catch {
      // Abaikan error jaringan sementara saat dev
    }
  }, []);

  const syncProfileFromStorage = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserProfileSettings>;
        if (saved.displayName?.trim()) setDisplayName(saved.displayName.trim());
        if (typeof saved.dailyCalories === "number" && saved.dailyCalories > 0) {
          setDailyCalorieTarget(saved.dailyCalories);
        }
        if (typeof saved.waterMl === "number" && saved.waterMl > 0) {
          setDailyWaterTarget(saved.waterMl);
        }
        setMacroTargets((prev) => ({
          proteinGrams:
            typeof saved.proteinGrams === "number" && saved.proteinGrams > 0
              ? saved.proteinGrams
              : prev.proteinGrams,
          carbsGrams:
            typeof saved.carbsGrams === "number" && saved.carbsGrams > 0
              ? saved.carbsGrams
              : prev.carbsGrams,
          fatsGrams:
            typeof saved.fatsGrams === "number" && saved.fatsGrams > 0
              ? saved.fatsGrams
              : prev.fatsGrams,
        }));
      }
    } catch {
      // Abaikan jika storage tidak tersedia
    }
    setSubscription(loadSubscriptionState());
  }, []);

  useEffect(() => {
    setCurrentHour(new Date().getHours());
    syncProfileFromStorage();

    async function loadInitialData() {
      try {
        const { data: planData } = await supabase
          .from("workout_plans")
          .select("id, title_en, title_id, planner_mode, estimated_minutes")
          .limit(1)
          .single();

        if (planData) setPlan(planData);

        const { data: exData } = await supabase
          .from("exercises")
          .select("id, name_en, name_id, muscle_group, default_sets, default_reps")
          .limit(5);

        if (exData) setExercises(exData);
      } catch {
        // Abaikan error awal jika offline
      }
    }

    loadInitialData();
    loadTodayCalories();
    loadWeeklyWorkouts();
  }, [syncProfileFromStorage, loadTodayCalories, loadWeeklyWorkouts]);

  useEffect(() => {
    if (activeTab === "home" || activeTab === "coach" || activeTab === "profile") {
      setCurrentHour(new Date().getHours());
      syncProfileFromStorage();
      if (activeTab === "home") {
        loadTodayCalories();
        loadWeeklyWorkouts();
      }
    }
  }, [activeTab, syncProfileFromStorage, loadTodayCalories, loadWeeklyWorkouts]);

  const handleLogoutClick = useCallback(() => {
    setActiveTab("home");
    onLogout();
  }, [onLogout]);

  const planTitle =
    lang === "id"
      ? computedFromMember.recommendedPlanTitleId || plan?.title_id || "Dada & Trisep"
      : computedFromMember.recommendedPlanTitleEn || plan?.title_en || "Chest & Triceps";

  const greetingText = `${getTimeGreeting(lang, currentHour)}, ${displayName}!`;
  const weeklyPercent = Math.min(
    100,
    Math.round((weeklyWorkoutsDone / Math.max(1, weeklyWorkoutGoal)) * 100)
  );

  return (
    <div className="min-h-screen bg-[#0B0D0C] text-white pb-24">
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Top Bar + Bilingual Switcher + Log Out */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Fit<span className="text-[#9EF01A]">Mate</span>
            </Link>
            <p className="text-xs text-neutral-400">{t.tagline}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#161A18] p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setLang("id")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  lang === "id"
                    ? "bg-[#9EF01A] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  lang === "en"
                    ? "bg-[#9EF01A] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-2.5 py-1.5 rounded-full bg-[#161A18] border border-white/15 text-[11px] font-semibold text-neutral-300 hover:border-red-400/50 hover:text-red-300 transition cursor-pointer"
            >
              {lang === "id" ? "Keluar" : "Log Out"}
            </button>
          </div>
        </div>

        {/* KONTEN TAB BERANDA */}
        {activeTab === "home" && (
          <>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold break-words">{greetingText}</h1>
                <p className="text-sm text-neutral-400 mt-1">
                  {lang === "id"
                    ? `TB ${memberProfile.height_cm} cm • BB ${memberProfile.weight_kg} kg • BMI ${computedFromMember.bmi}`
                    : `Height ${memberProfile.height_cm} cm • Weight ${memberProfile.weight_kg} kg • BMI ${computedFromMember.bmi}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="px-3 py-1.5 rounded-xl bg-[#161A18] border border-white/15 text-[11px] font-semibold text-neutral-300 hover:border-[#9EF01A]/50 hover:text-white transition shrink-0 cursor-pointer"
              >
                {lang === "id" ? "Edit Profil" : "Edit Profile"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-5">
              <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-neutral-400">{t.workoutsWeek}</p>
                <p className="text-2xl font-bold mt-1 text-white">
                  {weeklyWorkoutsDone} / {weeklyWorkoutGoal}
                </p>
                <p className="text-[11px] text-[#9EF01A] mt-1">
                  {weeklyPercent}% Target
                </p>
              </div>
              <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-neutral-400">{t.caloriesToday}</p>
                <p className="text-2xl font-bold mt-1 text-white">
                  {formatNumber(todayCalories)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  / {formatNumber(dailyCalorieTarget)} kcal
                </p>
              </div>
            </div>

            <div className="bg-[#161A18] border border-white/10 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#9EF01A] uppercase tracking-wider">
                  {t.todaysWorkout}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#9EF01A]/15 text-[#9EF01A]">
                  {lang === "id" ? "Otomatis Dari Profil" : "Auto From Profile"}
                </span>
              </div>

              <h2 className="text-xl font-bold">{planTitle}</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {lang === "id"
                  ? computedFromMember.recommendedWorkoutSummaryId
                  : computedFromMember.recommendedWorkoutSummaryEn}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                {exercises.length || 6} Exercises • {plan?.estimated_minutes ?? 45} min
              </p>

              <button
                type="button"
                onClick={() => setActiveTab("workout")}
                className="mt-4 w-full py-3.5 rounded-xl bg-[#9EF01A] text-black font-bold text-sm hover:brightness-105 transition cursor-pointer"
              >
                {t.startWorkout} →
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold mb-3">{t.quickAccess}</h3>
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("nutrition")}
                  className="bg-[#161A18] border border-white/10 rounded-xl py-3 px-2 text-center hover:border-[#9EF01A]/50 transition cursor-pointer"
                >
                  <div className="text-xs font-semibold">{t.nutrition}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("progress")}
                  className="bg-[#161A18] border border-white/10 rounded-xl py-3 px-2 text-center hover:border-[#9EF01A]/50 transition cursor-pointer"
                >
                  <div className="text-xs font-semibold">{t.progress}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("coach")}
                  className="bg-[#161A18] border border-white/10 rounded-xl py-3 px-2 text-center hover:border-[#9EF01A]/50 transition cursor-pointer"
                >
                  <div className="text-xs font-semibold">{t.aiCoach}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="bg-[#161A18] border border-[#9EF01A]/30 rounded-xl py-3 px-2 text-center hover:border-[#9EF01A]/70 transition cursor-pointer"
                >
                  <div className="text-xs font-semibold text-[#9EF01A]">
                    {subscription.tier === "pro" ? "PRO" : t.navProfile}
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-3">{t.exerciseLib}</h3>
              <div className="space-y-2.5">
                {exercises.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#161A18] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {lang === "id" ? item.name_id : item.name_en}
                      </p>
                      <p className="text-xs text-neutral-400">{item.muscle_group}</p>
                    </div>
                    <span className="text-xs text-[#9EF01A] font-medium">
                      {item.default_sets} × {item.default_reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* KONTEN TAB LATIHAN */}
        {activeTab === "workout" && (
          <WorkoutTab lang={lang} />
        )}

        {/* KONTEN TAB NUTRISI */}
        {activeTab === "nutrition" && (
          <NutritionTab
            lang={lang}
            calorieTarget={dailyCalorieTarget}
            waterTarget={dailyWaterTarget}
          />
        )}

        {/* KONTEN TAB PROGRES */}
        {activeTab === "progress" && (
          <section className="space-y-6">
            <DietProgressFollowUp
              logs={progressLogs}
              targetWeightKg={progressTargetWeight}
              loading={loadingProgress}
              onSaveLog={handleSaveProgressLog}
            />
            <ProgressTab
              lang={lang}
              onTargetsCalculated={handleTargetsCalculated}
            />
          </section>
        )}

        {/* KONTEN TAB AI COACH */}
        {activeTab === "coach" && (
          <AiCoachTab
            lang={lang}
            subscription={subscription}
            onOpenProfile={() => setActiveTab("profile")}
            context={{
              calorieTarget: dailyCalorieTarget,
              proteinTarget: macroTargets.proteinGrams,
              carbsTarget: macroTargets.carbsGrams,
              fatsTarget: macroTargets.fatsGrams,
              waterTarget: dailyWaterTarget,
              loggedCalories: todayCalories,
              weightKg: memberProfile.weight_kg,
              heightCm: memberProfile.height_cm,
              bmi: computedFromMember.bmi,
              goal: memberProfile.goal,
            }}
          />
        )}

        {/* KONTEN TAB PROFIL */}
        {activeTab === "profile" && (
          <ProfileTab
            lang={lang}
            onChangeLang={setLang}
            targets={{
              dailyCalories: dailyCalorieTarget,
              proteinGrams: macroTargets.proteinGrams,
              carbsGrams: macroTargets.carbsGrams,
              fatsGrams: macroTargets.fatsGrams,
              waterMl: dailyWaterTarget,
            }}
            onApplyTargets={handleTargetsCalculated}
            onSubscriptionChange={setSubscription}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#121614]/95 backdrop-blur border-t border-white/10">
        <div className="max-w-md mx-auto grid grid-cols-6 py-2.5 text-center text-[10px]">
          {[
            { key: "home", label: t.navHome },
            { key: "workout", label: t.navWorkout },
            { key: "nutrition", label: t.navNutrition },
            { key: "progress", label: t.navProgress },
            { key: "coach", label: t.aiCoach },
            { key: "profile", label: t.navProfile },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`py-1 font-semibold transition cursor-pointer ${
                  isActive ? "text-[#9EF01A]" : "text-neutral-400"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function FitMateAppPage() {
  return (
    <MemberOnboardingGate lang="id">
      {({ profile, openEditProfile, logout }) => (
        <AuthenticatedWorkspace
          memberProfile={profile}
          onOpenEditProfile={openEditProfile}
          onLogout={logout}
        />
      )}
    </MemberOnboardingGate>
  );
}