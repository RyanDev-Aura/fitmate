export type MemberGender = "male" | "female";
export type MemberActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type MemberGoal = "fat_loss" | "recomp" | "muscle_gain";
export type SocialPlatform = "instagram" | "tiktok" | "x" | "youtube" | "other";
export type WorkoutFocusType = "cardio_circuit" | "hybrid_strength" | "hypertrophy_strength";

export interface MemberProfileInput {
  id?: string;
  auth_user_id?: string | null;
  device_key?: string;

  full_name: string;
  display_name: string;
  email: string;
  whatsapp_phone: string;
  social_platform: SocialPlatform;
  social_handle: string;
  auto_share_enabled: boolean;

  age: number;
  gender: MemberGender;
  height_cm: number;
  weight_kg: number;
  activity_level: MemberActivityLevel;
  goal: MemberGoal;

  head_circumference_cm?: number | null;
  neck_circumference_cm?: number | null;
  abdomen_circumference_cm?: number | null;
  waist_circumference_cm?: number | null;
  arm_circumference_cm?: number | null;

  onboarding_completed?: boolean;
}

export interface ComputedMemberTargets {
  bmi: number;
  bmiCategoryId: string;
  bmiCategoryEn: string;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
  weeklyWorkoutGoal: number;
  workoutFocusType: WorkoutFocusType;
  recommendedPlanTitleId: string;
  recommendedPlanTitleEn: string;
  recommendedWorkoutSummaryId: string;
  recommendedWorkoutSummaryEn: string;
  waistToHeightRatio: number | null;
}

export interface MemberProfileRecord extends MemberProfileInput {
  bmi: number;
  daily_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
  water_ml: number;
  recommended_workout_mode: WorkoutFocusType;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export const MEMBER_PROFILE_STORAGE_KEY = "fitmate_member_profile_v1";
export const MEMBER_DEVICE_KEY_STORAGE = "fitmate_member_device_key_v1";

const ACTIVITY_MULTIPLIERS: Record<MemberActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function sanitizePositiveNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeOptionalCm(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(Math.min(250, Math.max(10, num)) * 10) / 10;
}

export function getBmiCategory(bmi: number): { id: string; en: string } {
  if (bmi < 18.5) return { id: "Kurus / Underweight", en: "Underweight" };
  if (bmi < 25) return { id: "Ideal / Normal", en: "Normal" };
  if (bmi < 30) return { id: "Berlebih / Overweight", en: "Overweight" };
  return { id: "Obesitas / Obese", en: "Obese" };
}

export function calculateMemberTargets(input: {
  age: number;
  gender: MemberGender;
  height_cm: number;
  weight_kg: number;
  activity_level: MemberActivityLevel;
  goal: MemberGoal;
  waist_circumference_cm?: number | null;
  abdomen_circumference_cm?: number | null;
}): ComputedMemberTargets {
  const age = sanitizePositiveNumber(input.age, 25, 10, 110);
  const heightCm = sanitizePositiveNumber(input.height_cm, 170, 100, 250);
  const weightKg = sanitizePositiveNumber(input.weight_kg, 68, 25, 350);
  const activity = input.activity_level || "moderate";
  const goal = input.goal || "recomp";

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  const bmiCat = getBmiCategory(bmi);

  // Mifflin-St Jeor Equation
  const rawBmr =
    input.gender === "female"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const bmr = Math.max(1100, Math.round(rawBmr));
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);

  let goalDelta = 0;
  if (goal === "fat_loss") goalDelta = -400;
  if (goal === "muscle_gain") goalDelta = 300;

  const minFloor = input.gender === "female" ? 1300 : 1500;
  const dailyCalories = Math.max(minFloor, Math.round((tdee + goalDelta) / 10) * 10);

  const proteinFactor =
    goal === "muscle_gain" ? 2.0 : goal === "fat_loss" ? 1.9 : 1.8;
  const proteinGrams = Math.max(60, Math.round(weightKg * proteinFactor));

  const fatFactor = goal === "fat_loss" ? 0.8 : 0.9;
  const fatsGrams = Math.max(35, Math.round(weightKg * fatFactor));

  const usedKcal = proteinGrams * 4 + fatsGrams * 9;
  const carbsGrams = Math.max(50, Math.round((dailyCalories - usedKcal) / 4));

  const waterMl = Math.max(
    1800,
    Math.round((weightKg * 35 + (goal === "muscle_gain" ? 300 : 0)) / 50) * 50
  );

  const waistRef = sanitizeOptionalCm(input.waist_circumference_cm ?? input.abdomen_circumference_cm);
  const waistToHeightRatio =
    waistRef !== null ? Math.round((waistRef / heightCm) * 100) / 100 : null;

  let workoutFocusType: WorkoutFocusType = "hybrid_strength";
  let weeklyWorkoutGoal = 4;
  let recommendedPlanTitleId = "Hybrid Strength & Kondisi Tubuh";
  let recommendedPlanTitleEn = "Hybrid Strength & Conditioning";
  let recommendedWorkoutSummaryId =
    "Kombinasi latihan beban terukur dan kardio ringan/sedang sesuai profil tubuhmu.";
  let recommendedWorkoutSummaryEn =
    "Balanced strength training and steady conditioning tailored to your body profile.";

  if (goal === "fat_loss") {
    workoutFocusType = "cardio_circuit";
    weeklyWorkoutGoal = 5;
    recommendedPlanTitleId = "Full-Body Circuit & Kardio Terukur";
    recommendedPlanTitleEn = "Full-Body Circuit & Cardio";
    recommendedWorkoutSummaryId =
      "Fokus pengeluaran energi harian, gerakan majemuk (compound), dan kardio bertahap tanpa memforsir.";
    recommendedWorkoutSummaryEn =
      "Focused on daily energy expenditure, compound movements, and gradual cardio.";
  } else if (goal === "muscle_gain") {
    workoutFocusType = "hypertrophy_strength";
    weeklyWorkoutGoal = 5;
    recommendedPlanTitleId = "Progressive Overload & Hipertrofi Otot";
    recommendedPlanTitleEn = "Progressive Overload & Hypertrophy";
    recommendedWorkoutSummaryId =
      "Fokus peningkatan beban bertahap, kontrol repetisi, dan pemulihan otot per kelompok.";
    recommendedWorkoutSummaryEn =
      "Focused on progressive load, controlled reps, and muscle group recovery.";
  }

  return {
    bmi,
    bmiCategoryId: bmiCat.id,
    bmiCategoryEn: bmiCat.en,
    bmr,
    tdee,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    waterMl,
    weeklyWorkoutGoal,
    workoutFocusType,
    recommendedPlanTitleId,
    recommendedPlanTitleEn,
    recommendedWorkoutSummaryId,
    recommendedWorkoutSummaryEn,
    waistToHeightRatio,
  };
}

export function normalizeMemberProfile(input: MemberProfileInput): MemberProfileRecord {
  const fullName = String(input.full_name ?? "").trim();
  const displayName =
    String(input.display_name ?? "").trim() ||
    fullName.split(" ")[0] ||
    "Member";

  const age = sanitizePositiveNumber(input.age, 25, 10, 110);
  const heightCm = sanitizePositiveNumber(input.height_cm, 170, 100, 250);
  const weightKg = sanitizePositiveNumber(input.weight_kg, 68, 25, 350);
  const gender: MemberGender = input.gender === "female" ? "female" : "male";
  const activityLevel: MemberActivityLevel = input.activity_level || "moderate";
  const goal: MemberGoal = input.goal || "recomp";

  const headCm = sanitizeOptionalCm(input.head_circumference_cm);
  const neckCm = sanitizeOptionalCm(input.neck_circumference_cm);
  const abdomenCm = sanitizeOptionalCm(input.abdomen_circumference_cm);
  const waistCm = sanitizeOptionalCm(input.waist_circumference_cm);
  const armCm = sanitizeOptionalCm(input.arm_circumference_cm);

  const computed = calculateMemberTargets({
    age,
    gender,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity_level: activityLevel,
    goal,
    waist_circumference_cm: waistCm,
    abdomen_circumference_cm: abdomenCm,
  });

  const cleanHandle = String(input.social_handle ?? "")
    .trim()
    .replace(/^@+/, "");

  return {
    ...input,
    full_name: fullName,
    display_name: displayName,
    email: String(input.email ?? "").trim().toLowerCase(),
    whatsapp_phone: String(input.whatsapp_phone ?? "").trim(),
    social_platform: input.social_platform || "instagram",
    social_handle: cleanHandle,
    auto_share_enabled: Boolean(input.auto_share_enabled ?? true),
    age,
    gender,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity_level: activityLevel,
    goal,
    head_circumference_cm: headCm,
    neck_circumference_cm: neckCm,
    abdomen_circumference_cm: abdomenCm,
    waist_circumference_cm: waistCm,
    arm_circumference_cm: armCm,
    bmi: computed.bmi,
    daily_calories: computed.dailyCalories,
    protein_grams: computed.proteinGrams,
    carbs_grams: computed.carbsGrams,
    fats_grams: computed.fatsGrams,
    water_ml: computed.waterMl,
    recommended_workout_mode: computed.workoutFocusType,
    onboarding_completed: Boolean(
      fullName &&
        String(input.email ?? "").trim() &&
        String(input.whatsapp_phone ?? "").trim() &&
        input.onboarding_completed !== false
    ),
  };
}

export function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "server-device";
  try {
    const existing = window.localStorage.getItem(MEMBER_DEVICE_KEY_STORAGE);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `fm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(MEMBER_DEVICE_KEY_STORAGE, generated);
    return generated;
  } catch {
    return `fm-fallback-${Date.now()}`;
  }
}

export function loadLocalMemberProfile(): MemberProfileRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEMBER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberProfileInput;
    if (!parsed?.full_name || !parsed?.email || !parsed?.whatsapp_phone) {
      return null;
    }
    return normalizeMemberProfile(parsed);
  } catch {
    return null;
  }
}

export function saveLocalMemberProfile(profile: MemberProfileInput): MemberProfileRecord {
  const normalized = normalizeMemberProfile({
    ...profile,
    device_key: profile.device_key || getOrCreateDeviceKey(),
    onboarding_completed: true,
  });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        MEMBER_PROFILE_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch {
      // Abaikan jika storage penuh atau diblokir
    }
  }
  return normalized;
}