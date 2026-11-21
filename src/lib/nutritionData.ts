export type FoodPreset = {
  id: string;
  keywords: string[];
  label_id: string;
  label_en: string;
  defaultGrams: number;
  servingNote_id?: string;
  servingNote_en?: string;
  // Nilai nutrisi per 100g
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g: number;
};

// Faktor energi Atwater standar ahli gizi:
// 1g Protein = 4 kcal | 1g Karbohidrat = 4 kcal | 1g Lemak = 9 kcal
export function calcCaloriesFromMacros(
  proteinG: number,
  carbsG: number,
  fatsG: number
): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatsG * 9);
}

export const FOOD_PRESETS: FoodPreset[] = [
  // --- MAKANAN POKOK & OLAHAN NASI / MI ---
  {
    id: "white_rice",
    keywords: ["nasi", "nasi putih", "white rice", "steamed rice"],
    label_id: "Nasi Putih Matang",
    label_en: "Steamed White Rice",
    defaultGrams: 150,
    servingNote_id: "1 centong/porsi sedang (~150g)",
    servingNote_en: "1 medium serving (~150g)",
    proteinPer100g: 2.7,
    carbsPer100g: 28.0,
    fatsPer100g: 0.3,
    fiberPer100g: 0.4,
  },
  {
    id: "nasi_uduk",
    keywords: ["nasi uduk", "nasi kuning", "coconut rice"],
    label_id: "Nasi Uduk / Nasi Kuning",
    label_en: "Indonesian Coconut Rice",
    defaultGrams: 180,
    servingNote_id: "1 porsi sedang (~180g)",
    servingNote_en: "1 medium serving (~180g)",
    proteinPer100g: 3.5,
    carbsPer100g: 29.0,
    fatsPer100g: 6.5,
    fiberPer100g: 0.6,
  },
  {
    id: "fried_rice",
    keywords: ["nasi goreng", "nasgor", "fried rice"],
    label_id: "Nasi Goreng",
    label_en: "Indonesian Fried Rice",
    defaultGrams: 250,
    servingNote_id: "1 piring sedang (~250g)",
    servingNote_en: "1 medium plate (~250g)",
    proteinPer100g: 6.5,
    carbsPer100g: 30.0,
    fatsPer100g: 8.5,
    fiberPer100g: 1.2,
  },
  {
    id: "instant_noodles",
    keywords: ["mi instan", "mie instan", "indomie", "mie goreng", "mie kuah", "instant noodles"],
    label_id: "Mi Instan (Matang)",
    label_en: "Instant Noodles (Cooked)",
    defaultGrams: 220,
    servingNote_id: "1 bungkus matang (~220g)",
    servingNote_en: "1 cooked pack (~220g)",
    proteinPer100g: 4.5,
    carbsPer100g: 27.0,
    fatsPer100g: 7.5,
    fiberPer100g: 1.0,
  },
  {
    id: "kwetiau_bihun",
    keywords: ["bihun", "kwetiau", "bihun goreng", "kwetiau goreng", "rice noodles"],
    label_id: "Bihun / Kwetiau Goreng",
    label_en: "Fried Rice Vermicelli / Kwetiau",
    defaultGrams: 200,
    servingNote_id: "1 porsi sedang (~200g)",
    servingNote_en: "1 medium serving (~200g)",
    proteinPer100g: 5.0,
    carbsPer100g: 26.0,
    fatsPer100g: 6.5,
    fiberPer100g: 1.1,
  },
  {
    id: "lontong_ketupat",
    keywords: ["lontong", "ketupat", "compressed rice cake"],
    label_id: "Lontong / Ketupat",
    label_en: "Lontong / Ketupat",
    defaultGrams: 120,
    servingNote_id: "1 potong sedang (~120g)",
    servingNote_en: "1 medium piece (~120g)",
    proteinPer100g: 2.4,
    carbsPer100g: 26.5,
    fatsPer100g: 0.2,
    fiberPer100g: 0.4,
  },

  // --- LAUK HEWANI ---
  {
    id: "beef_rendang",
    keywords: ["rendang", "rendang daging", "beef rendang"],
    label_id: "Rendang Daging",
    label_en: "Beef Rendang",
    defaultGrams: 80,
    servingNote_id: "1 potong sedang (~80g)",
    servingNote_en: "1 medium piece (~80g)",
    proteinPer100g: 22.0,
    carbsPer100g: 4.5,
    fatsPer100g: 21.0,
    fiberPer100g: 1.5,
  },
  {
    id: "chicken_gulai",
    keywords: ["ayam gulai", "gulai ayam", "gulai", "chicken gulai"],
    label_id: "Ayam Gulai",
    label_en: "Chicken Gulai",
    defaultGrams: 120,
    servingNote_id: "1 potong + kuah (~120g)",
    servingNote_en: "1 piece + gravy (~120g)",
    proteinPer100g: 16.5,
    carbsPer100g: 3.5,
    fatsPer100g: 14.5,
    fiberPer100g: 0.8,
  },
  {
    id: "fried_chicken",
    keywords: ["ayam goreng", "ayam krispi", "fried chicken"],
    label_id: "Ayam Goreng",
    label_en: "Fried Chicken",
    defaultGrams: 110,
    servingNote_id: "1 potong sedang (~110g)",
    servingNote_en: "1 medium piece (~110g)",
    proteinPer100g: 21.0,
    carbsPer100g: 4.0,
    fatsPer100g: 15.0,
    fiberPer100g: 0.2,
  },
  {
    id: "chicken_breast",
    keywords: ["dada ayam", "ayam panggang", "ayam rebus", "ayam bakar", "chicken breast"],
    label_id: "Dada Ayam (tanpa kulit)",
    label_en: "Chicken Breast (skinless)",
    defaultGrams: 150,
    servingNote_id: "1 potong dada (~150g)",
    servingNote_en: "1 breast portion (~150g)",
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatsPer100g: 3.6,
    fiberPer100g: 0.0,
  },
  {
    id: "fried_fish",
    keywords: ["ikan goreng", "lele goreng", "nila goreng", "ikan bakar", "fried fish"],
    label_id: "Ikan Goreng (Lele / Nila)",
    label_en: "Fried Fish (Catfish / Tilapia)",
    defaultGrams: 120,
    servingNote_id: "1 ekor/potong sedang (~120g)",
    servingNote_en: "1 medium fish/piece (~120g)",
    proteinPer100g: 19.5,
    carbsPer100g: 1.5,
    fatsPer100g: 11.5,
    fiberPer100g: 0.0,
  },
  {
    id: "boiled_egg",
    keywords: ["telur", "telur rebus", "egg", "boiled egg"],
    label_id: "Telur Ayam Rebus",
    label_en: "Boiled Egg",
    defaultGrams: 100,
    servingNote_id: "~2 butir sedang (100g)",
    servingNote_en: "~2 medium eggs (100g)",
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatsPer100g: 9.5,
    fiberPer100g: 0.0,
  },
  {
    id: "omelette_egg",
    keywords: ["telur dadar", "telur ceplok", "mata sapi", "omelette", "fried egg"],
    label_id: "Telur Dadar / Ceplok",
    label_en: "Omelette / Fried Egg",
    defaultGrams: 70,
    servingNote_id: "1 butir olahan (~70g)",
    servingNote_en: "1 cooked egg (~70g)",
    proteinPer100g: 13.0,
    carbsPer100g: 1.5,
    fatsPer100g: 16.0,
    fiberPer100g: 0.0,
  },

  // --- LAUK NABATI & SAYURAN ---
  {
    id: "tempeh",
    keywords: ["tempe", "tempe goreng", "tempeh"],
    label_id: "Tempe Kedelai",
    label_en: "Tempeh",
    defaultGrams: 100,
    servingNote_id: "2–3 potong sedang (~100g)",
    servingNote_en: "2–3 medium slices (~100g)",
    proteinPer100g: 19.9,
    carbsPer100g: 9.4,
    fatsPer100g: 7.7,
    fiberPer100g: 4.5,
  },
  {
    id: "tofu",
    keywords: ["tahu", "tahu goreng", "tahu putih", "tofu"],
    label_id: "Tahu Goreng / Putih",
    label_en: "Fried / Plain Tofu",
    defaultGrams: 100,
    servingNote_id: "2 potong sedang (~100g)",
    servingNote_en: "2 medium pieces (~100g)",
    proteinPer100g: 10.5,
    carbsPer100g: 3.0,
    fatsPer100g: 8.5,
    fiberPer100g: 0.6,
  },
  {
    id: "kangkung",
    keywords: ["kangkung", "tumis kangkung", "cah kangkung", "water spinach"],
    label_id: "Tumis Kangkung",
    label_en: "Sautéed Water Spinach",
    defaultGrams: 120,
    servingNote_id: "1 porsi sayur (~120g)",
    servingNote_en: "1 vegetable serving (~120g)",
    proteinPer100g: 2.6,
    carbsPer100g: 4.5,
    fatsPer100g: 4.2,
    fiberPer100g: 2.1,
  },
  {
    id: "bayam",
    keywords: ["bayam", "sayur bayam", "bening bayam", "spinach"],
    label_id: "Sayur Bayam",
    label_en: "Spinach Soup / Greens",
    defaultGrams: 150,
    servingNote_id: "1 mangkuk kecil (~150g)",
    servingNote_en: "1 small bowl (~150g)",
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatsPer100g: 0.4,
    fiberPer100g: 2.2,
  },
  {
    id: "sayur_lodeh",
    keywords: ["sayur lodeh", "lodeh", "vegetable coconut soup"],
    label_id: "Sayur Lodeh",
    label_en: "Indonesian Coconut Vegetable Soup",
    defaultGrams: 150,
    servingNote_id: "1 mangkuk kecil (~150g)",
    servingNote_en: "1 small bowl (~150g)",
    proteinPer100g: 2.5,
    carbsPer100g: 7.5,
    fatsPer100g: 6.5,
    fiberPer100g: 2.0,
  },
  {
    id: "capcay",
    keywords: ["capcay", "cap cai", "mixed vegetables"],
    label_id: "Capcay Sayur",
    label_en: "Mixed Vegetable Capcay",
    defaultGrams: 150,
    servingNote_id: "1 porsi sayur (~150g)",
    servingNote_en: "1 vegetable serving (~150g)",
    proteinPer100g: 4.0,
    carbsPer100g: 6.5,
    fatsPer100g: 4.5,
    fiberPer100g: 2.4,
  },

  // --- GORENGAN & JAJANAN POPULER ---
  {
    id: "gorengan",
    keywords: ["gorengan", "bakwan", "bala-bala", "tahu isi", "fried snack"],
    label_id: "Gorengan (Bakwan / Tahu Isi)",
    label_en: "Fried Snack (Bakwan / Stuffed Tofu)",
    defaultGrams: 50,
    servingNote_id: "1 buah sedang (~50g)",
    servingNote_en: "1 medium piece (~50g)",
    proteinPer100g: 6.0,
    carbsPer100g: 26.0,
    fatsPer100g: 16.0,
    fiberPer100g: 2.0,
  },
  {
    id: "pisang_goreng",
    keywords: ["pisang goreng", "fried banana"],
    label_id: "Pisang Goreng",
    label_en: "Fried Banana",
    defaultGrams: 65,
    servingNote_id: "1 buah sedang (~65g)",
    servingNote_en: "1 medium piece (~65g)",
    proteinPer100g: 2.5,
    carbsPer100g: 32.0,
    fatsPer100g: 11.0,
    fiberPer100g: 1.8,
  },
  {
    id: "risoles_pastel",
    keywords: ["risoles", "risol", "pastel", "kroket"],
    label_id: "Risoles / Pastel",
    label_en: "Risoles / Pastel Snack",
    defaultGrams: 70,
    servingNote_id: "1 buah sedang (~70g)",
    servingNote_en: "1 medium piece (~70g)",
    proteinPer100g: 7.5,
    carbsPer100g: 24.0,
    fatsPer100g: 14.0,
    fiberPer100g: 1.2,
  },

  // --- MINUMAN HARIAN & KOPI / TEH ---
  {
    id: "kopi_nescafe",
    keywords: ["nescafe", "kopi nescafe", "kopi sachet", "kopi susu", "nescafé"],
    label_id: "Kopi Nescafé / Kopi Susu",
    label_en: "Nescafé / Milk Coffee",
    defaultGrams: 20,
    servingNote_id: "1 sachet kering (~20g) / seduhan ~83 kcal",
    servingNote_en: "1 dry sachet (~20g) / brewed ~83 kcal",
    proteinPer100g: 5.0,
    carbsPer100g: 65.0,
    fatsPer100g: 15.0,
    fiberPer100g: 0.5,
  },
  {
    id: "kopi_hitam",
    keywords: ["kopi hitam", "kopi tubruk", "black coffee", "americano", "kopi"],
    label_id: "Kopi Hitam (Tanpa Gula)",
    label_en: "Black Coffee (Unsweetened)",
    defaultGrams: 200,
    servingNote_id: "1 cangkir (~200ml)",
    servingNote_en: "1 cup (~200ml)",
    proteinPer100g: 0.2,
    carbsPer100g: 0.5,
    fatsPer100g: 0.0,
    fiberPer100g: 0.0,
  },
  {
    id: "es_teh_manis",
    keywords: ["es teh manis", "teh manis", "sweet iced tea", "es teh"],
    label_id: "Es Teh Manis / Teh Manis",
    label_en: "Sweet Iced Tea",
    defaultGrams: 250,
    servingNote_id: "1 gelas (~250ml)",
    servingNote_en: "1 glass (~250ml)",
    proteinPer100g: 0.0,
    carbsPer100g: 12.0,
    fatsPer100g: 0.0,
    fiberPer100g: 0.0,
  },
  {
    id: "teh_tawar",
    keywords: ["teh tawar", "teh hangat", "unsweetened tea", "teh"],
    label_id: "Teh Tawar / Hangat",
    label_en: "Unsweetened Tea",
    defaultGrams: 200,
    servingNote_id: "1 gelas/cangkir (~200ml)",
    servingNote_en: "1 glass/cup (~200ml)",
    proteinPer100g: 0.0,
    carbsPer100g: 0.2,
    fatsPer100g: 0.0,
    fiberPer100g: 0.0,
  },
  {
    id: "susu_skm",
    keywords: ["susu", "susu kental manis", "skm", "susu uht", "milk"],
    label_id: "Susu / Susu Kental Manis",
    label_en: "Milk / Sweetened Condensed Milk",
    defaultGrams: 200,
    servingNote_id: "1 gelas (~200ml)",
    servingNote_en: "1 glass (~200ml)",
    proteinPer100g: 3.4,
    carbsPer100g: 14.0,
    fatsPer100g: 4.5,
    fiberPer100g: 0.0,
  },
];

export function matchFoodPreset(query: string): FoodPreset | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let bestMatch: FoodPreset | null = null;
  let bestScore = 0;

  for (const preset of FOOD_PRESETS) {
    for (const kw of preset.keywords) {
      const k = kw.toLowerCase();
      if (q === k) {
        return preset;
      }
      if (q.includes(k) || k.includes(q)) {
        const score = k.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = preset;
        }
      }
    }
  }

  return bestMatch;
}

export function computeNutritionByGrams(preset: FoodPreset, grams: number) {
  const safeGrams = Math.max(0, grams);
  const factor = safeGrams / 100;
  const protein_g = Number((preset.proteinPer100g * factor).toFixed(1));
  const carbs_g = Number((preset.carbsPer100g * factor).toFixed(1));
  const fats_g = Number((preset.fatsPer100g * factor).toFixed(1));
  const fiber_g = Number((preset.fiberPer100g * factor).toFixed(1));
  const calories = calcCaloriesFromMacros(protein_g, carbs_g, fats_g);

  return {
    calories,
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fats_g: Math.round(fats_g),
    fiber_g,
  };
}