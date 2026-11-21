import { NextRequest, NextResponse } from "next/server";

type CoachContext = {
  lang?: "id" | "en";
  calorieTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatsTarget?: number;
  waterTarget?: number;
  loggedCalories?: number;
  loggedWater?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  goal?: string;
};

function buildFallbackCoachReply(prompt: string, ctx: CoachContext): string {
  const isId = ctx.lang !== "en";
  const q = prompt.toLowerCase().trim();
  const targetKcal = ctx.calorieTarget ?? 2500;
  const loggedKcal = ctx.loggedCalories ?? 0;
  const remainingKcal = Math.max(0, targetKcal - loggedKcal);
  const waterTarget = ctx.waterTarget ?? 2500;
  const loggedWater = ctx.loggedWater ?? 0;
  const remainingWater = Math.max(0, waterTarget - loggedWater);
  const proteinG = ctx.proteinTarget ?? 150;

  if (isId) {
    // 0. Topik spesifik: Kopi / Kafein / Ngopi / Kopi malam
    if (
      q.includes("kopi") ||
      q.includes("kafein") ||
      q.includes("ngopi")
    ) {
      const isNightOrSleep =
        q.includes("malam") ||
        q.includes("tidur") ||
        q.includes("sore") ||
        q.includes("begadang");

      return [
        isNightOrSleep
          ? "Jujur, minum kopi atau kopi susu pada malam hari menjelang tidur kurang cocok kalau tujuan Anda diet BB. Kafein bisa mengganggu kualitas tidur, dan tidur yang kurang nyenyak justru sering bikin nafsu makan lebih sulit dikontrol keesokan harinya."
          : "Kopi sebenarnya tetap bisa masuk saat diet BB selama waktunya pas dan kalorinya terhitung—apalagi jika pakai susu, gula, atau kreamer.",
        "Solusi praktis: jika ingin ngopi, sebaiknya lakukan di pagi atau siang hari (usahakan beri jeda 6–8 jam sebelum jam tidur). Kalau malam hari ingin minuman hangat, pilih air hangat atau teh herbal bebas kafein.",
        `Tips & trik: kurangi tambahan gula/kental manis berlebih, perhatikan kenyamanan lambung jika diminum saat perut kosong, dan tetap sesuaikan dengan target harian Anda (${targetKcal} kcal).`,
      ].join("\n\n");
    }

    // 1. Topik spesifik: Rendang / Gulai / Santan / Lauk bersantan
    if (
      q.includes("rendang") ||
      q.includes("gulai") ||
      q.includes("santan") ||
      q.includes("bersantan")
    ) {
      return [
        "Halo! Santai saja, rendang dan gulai tetap bisa masuk menu diet kok asal porsinya terukur.",
        "Solusi & porsi aman: pilih 1 potong sedang daging/ayam (~70–100g) dan batasi kuah/bumbu berminyaknya agar lemak tidak melonjak drastis. Padukan dengan nasi porsi wajar (100–150g) serta sayuran/lalapan agar lebih mengenyangkan.",
        `Tips & trik: saring kelebihan minyak/kuah pekat di sendok, kurangi gorengan atau minuman manis di waktu makan yang sama, dan sesuaikan dengan target harian Anda (${targetKcal} kcal).`,
      ].join("\n\n");
    }

    // 2. Topik spesifik: Minum air / Hidrasi / Begah
    if (
      q.includes("air") ||
      q.includes("hidrasi") ||
      q.includes("begah") ||
      (q.includes("minum") && !q.includes("kopi") && !q.includes("teh"))
    ) {
      return [
        `Halo! Target hidrasi Anda ${waterTarget} ml (tercatat ${loggedWater} ml, sisa ${remainingWater} ml). Minum sekaligus banyak memang bikin perut begah.`,
        "Solusi praktis: bagi target minum menjadi 6–8 sesi kecil sepanjang hari (sekitar 150–250 ml tiap 1–2 jam), bukan diteguk banyak dalam satu waktu.",
        "Tips & trik: siapkan botol/gelas khusus di meja kerja, minum 1 gelas setelah bangun tidur dan sebelum makan, lalu kurangi minum terlalu banyak tepat menjelang tidur agar tidak sering terbangun.",
      ].join("\n\n");
    }

    // 3. Topik spesifik: Menu makan siang / Tinggi protein
    if (
      q.includes("makan siang") ||
      q.includes("lunch") ||
      q.includes("protein") ||
      q.includes("menu")
    ) {
      return [
        `Siap, kita racik makan siang yang praktis dan kenyang lebih lama! Target protein harian Anda sekitar ${proteinG}g dengan sisa kalori hari ini ~${remainingKcal} kcal.`,
        "Solusi menu praktis: 150g nasi putih (~195 kcal) + 120–150g dada ayam/ikan/tempe-tahu (~180–250 kcal) + tumis kangkung/bayam/capcay minyak ringan (~60–90 kcal).",
        "Tips & trik: dahulukan protein dan sayur saat makan agar gula darah lebih stabil dan tidak gampang ngantuk atau lapar lagi di jam 3–4 sore.",
      ].join("\n\n");
    }

    // 4. Topik spesifik: Jadwal olahraga / Lari / Jalan / Beban / Smartwatch
    if (
      q.includes("lari") ||
      q.includes("jalan") ||
      q.includes("beban") ||
      q.includes("jadwal") ||
      q.includes("latihan") ||
      q.includes("olahraga") ||
      q.includes("smartwatch") ||
      q.includes("jam")
    ) {
      return [
        "Untuk pemula, kunci utamanya adalah ritme yang konsisten dan tidak langsung memforsir tubuh di minggu pertama.",
        "Solusi jadwal sederhana: 3–4 hari/minggu kombinasi jalan cepat/jogging 20–30 menit dan latihan beban dasar (squat, push-up/incline push-up, row, plank) 2–3 set per gerakan, beri jeda istirahat antar hari latihan.",
        "Tips & trik: pemanasan 5 menit dulu sebelum mulai, dan jika pakai smartwatch/jam olahraga, jadikan angka kalori terbakar sebagai informasi tambahan saja—fokus utama tetap pada konsistensi latihan dan target nutrisi harian.",
      ].join("\n\n");
    }

    // 5. Topik kalori / diet umum
    if (q.includes("kalori") || q.includes("diet") || q.includes("defisit")) {
      return [
        `Saat ini target harian Anda ${targetKcal} kcal, sudah tercatat ${loggedKcal} kcal, jadi tersisa sekitar ${remainingKcal} kcal.`,
        "Solusi terbaik: jaga defisit/target tetap realistis dan cukupi protein harian agar rasa lapar lebih terkendali dan massa otot tetap terjaga.",
        "Tips & trik: catat porsi makanan sedekat mungkin dengan realita (termasuk minyak goreng dan minuman manis) lalu evaluasi mingguan, bukan panik karena fluktuasi 1 hari.",
      ].join("\n\n");
    }

    // 6. Jawaban CS natural untuk pertanyaan umum lainnya
    return [
      `Halo! Saya siap bantu jawab pertanyaan Anda terkait nutrisi, porsi makan, hidrasi, maupun latihan (target harian Anda saat ini ${targetKcal} kcal).`,
      "Untuk jawaban yang paling pas, boleh sebutkan detail kondisinya—misalnya jenis makanan/porsi, keluhan begah/lapar/tidur, atau tujuan latihan Anda.",
      "Tips & trik: mulai dari satu perubahan kecil yang paling mudah dilakukan hari ini, lalu konsistenkan.",
    ].join("\n\n");
  }

  if (q.includes("coffee") || q.includes("caffeine") || q.includes("sleep")) {
    return [
      "Having coffee late at night before sleep isn't ideal if your goal is weight loss—caffeine can disrupt sleep quality, and poor sleep often increases hunger and cravings the next day.",
      "Practical solution: enjoy coffee earlier in the day (ideally 6–8 hours before bedtime), and opt for warm water or caffeine-free herbal tea in the evening.",
      `Tips & tricks: watch added sugar/syrups/creamers and keep everything aligned with your ${targetKcal} kcal daily target.`,
    ].join("\n\n");
  }

  return [
    `Hi! Your active daily target is ${targetKcal} kcal (${loggedKcal} kcal logged, ${remainingKcal} kcal left).`,
    "Share what you're planning to eat, drink, or train today, and I'll give practical portions, solutions, and tips.",
  ].join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const context: CoachContext = body?.context ?? {};

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const systemInstruction = [
        "You are FitMate AI Coach, a warm, helpful, customer-support-style fitness and nutrition assistant.",
        "Answer the user's exact question directly first, then provide practical tips, tricks, and actionable solutions.",
        "Do NOT give generic meal/calorie replies when the user asks about coffee before sleep, hydration, or workout schedules.",
        "Respond in Indonesian if context.lang === 'id', otherwise English. Keep formatting clean and mobile-friendly.",
        `User context: ${JSON.stringify(context)}`,
      ].join(" ");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: message }],
              },
            ],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (text) {
          return NextResponse.json({ reply: text });
        }
      }
    }

    return NextResponse.json({
      reply: buildFallbackCoachReply(message, context),
      fallback: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process AI Coach request" },
      { status: 500 }
    );
  }
}