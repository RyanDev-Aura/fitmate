export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type FitnessGoal = "lose_fat" | "maintain" | "build_muscle";

export type BodyMetricsInput = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: FitnessGoal;
};

export type NutritionTargets = {
  bmi: number;
  bmiCategoryId: string;
  bmiCategoryEn: string;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  calorieDiff: number; // negatif = defisit, positif = surplus
  weeklyWeightChangeKg: number; // estimasi kg per minggu
  proteinGrams: number;
  fatsGrams: number;
  carbsGrams: number;
  waterMl: number;
  safetyNoteId: string;
  safetyNoteEn: string;
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (heightM <= 0 || weightKg <= 0) return 0;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBmiCategory(bmi: number): { id: string; en: string } {
  if (bmi <= 0) return { id: "-", en: "-" };
  if (bmi < 18.5) return { id: "Berat Badan Kurang", en: "Underweight" };
  if (bmi < 23) return { id: "Normal (Asia-Pasifik)", en: "Normal (Asia-Pacific)" };
  if (bmi < 25) return { id: "Berlebih / Risiko Obesitas", en: "Overweight / At Risk" };
  if (bmi < 30) return { id: "Obesitas Tingkat I", en: "Obesity Class I" };
  return { id: "Obesitas Tingkat II", en: "Obesity Class II" };
}

export function calculateIndividualTargets(input: BodyMetricsInput): NutritionTargets {
  const weightKg = Math.max(30, input.weightKg || 65);
  const heightCm = Math.max(120, input.heightCm || 170);
  const age = Math.max(14, input.age || 25);

  const bmi = calculateBmi(weightKg, heightCm);
  const bmiCat = getBmiCategory(bmi);

  // Rumus BMR Mifflin-St Jeor
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(input.sex === "male" ? baseBmr + 5 : baseBmr - 161);

  const activityFactor: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };

  const tdee = Math.round(bmr * activityFactor[input.activity]);

  // Batas bawah kalori aman agar diet tidak terlalu ekstrem
  const safeFloor = Math.max(bmr, input.sex === "male" ? 1500 : 1200);

  let rawTarget = tdee;
  if (input.goal === "lose_fat") {
    // Defisit bertahap ~20% atau 450 kcal agar aman & berkelanjutan
    const deficit = Math.min(500, Math.round(tdee * 0.2));
    rawTarget = Math.max(safeFloor, tdee - deficit);
  } else if (input.goal === "build_muscle") {
    rawTarget = tdee + 250;
  }

  const dailyCalories = Math.round(rawTarget);
  const calorieDiff = dailyCalories - tdee;
  // 1 kg lemak tubuh ≈ 7,700 kcal
  const weeklyWeightChangeKg = Number(((calorieDiff * 7) / 7700).toFixed(2));

  // Target Makro:
  // Saat diet turun BB, protein lebih tinggi (1.6g/kg) untuk menjaga massa otot
  const proteinPerKg = input.goal === "lose_fat" ? 1.6 : 1.4;
  const proteinGrams = Math.round(weightKg * proteinPerKg);

  // Lemak sehat ~25% dari total kalori target
  const fatsGrams = Math.max(35, Math.round((dailyCalories * 0.25) / 9));

  // Sisa kalori dari protein (4 kcal/g) dan lemak (9 kcal/g) dialokasikan ke karbohidrat (4 kcal/g)
  const remainingForCarbs = Math.max(0, dailyCalories - proteinGrams * 4 - fatsGrams * 9);
  const carbsGrams = Math.round(remainingForCarbs / 4);

  // Hidrasi harian (~33 ml/kg BB, dibulatkan ke kelipatan 50 ml)
  const waterMl = Math.max(1500, Math.round((weightKg * 33) / 50) * 50);

  const safetyNoteId =
    input.goal === "lose_fat"
      ? "Defisit bertahap menjaga energi & massa otot. Target ideal turun BB umumnya 0,5–1 kg/minggu."
      : "Target dihitung otomatis dari BMR, TDEE, dan tujuan latihan Anda.";

  const safetyNoteEn =
    input.goal === "lose_fat"
      ? "Gradual deficit protects energy & lean mass. Healthy weight loss is typically 0.5–1 kg/week."
      : "Targets are calculated from your BMR, TDEE, and fitness goal.";

  return {
    bmi,
    bmiCategoryId: bmiCat.id,
    bmiCategoryEn: bmiCat.en,
    bmr,
    tdee,
    dailyCalories,
    calorieDiff,
    weeklyWeightChangeKg,
    proteinGrams,
    fatsGrams,
    carbsGrams,
    waterMl,
    safetyNoteId,
    safetyNoteEn,
  };
}