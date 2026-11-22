import { NextRequest, NextResponse } from "next/server";

type CoachHistoryItem = {
  role?: "user" | "assistant" | "model";
  content?: string;
  text?: string;
};

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
  history?: CoachHistoryItem[];
};

const CORE_BELIEF_ID =
  "Aku bukan di sini untuk membuatmu takut makan. Aku di sini untuk membantumu memahami tubuhmu, memperbaiki kebiasaan, dan mencapai target dengan cara yang sehat.";

const CORE_BELIEF_EN =
  "I'm not here to make you afraid of food. I'm here to help you understand your body, build healthier habits, and reach your goals sustainably.";

function pickVariant<T>(items: T[], seedText: string): T {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 100000;
  }
  return items[Math.abs(hash) % items.length];
}

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
  const seed = `${q}-${loggedKcal}-${loggedWater}-${targetKcal}`;

  if (isId) {
    // 0. Kopi / Kafein / Ngopi
    if (q.includes("kopi") || q.includes("kafein") || q.includes("ngopi")) {
      const isNightOrSleep =
        q.includes("malam") ||
        q.includes("tidur") ||
        q.includes("sore") ||
        q.includes("begadang");

      if (isNightOrSleep) {
        return pickVariant(
          [
            `${CORE_BELIEF_ID}\n\nKalau ngopinya pas malam menjelang tidur dan targetmu mau nurunin BB, ini agak kurang bersahabat sih. Bukan kopinya yang jahat, tapi kafeinnya bisa bikin tidur kepotong—dan tidur yang kurang nyenyak itu sering bikin besoknya gampang lapar atau pengen ngemil manis. Kalau kangen yang hangat malam-malam, air hangat atau teh bebas kafein lebih aman buat tidurmu. Jam berapa biasanya kamu mulai tidur?`,
            `Ngopi malam itu seringnya bikin drama di jam tidur, padahal tidur yang cukup justru ngebantu ngontrol rasa lapar besok harinya. Kopi sendiri aman kok buat diet selama gula/susu kental manisnya nggak kebablasan dan waktunya pas. Biasanya kamu minum kopi hitam polos atau pakai susu/gula?`,
          ],
          seed
        );
      }

      return pickVariant(
        [
          `Kopi tetap boleh masuk kok selama nggak berubah jadi "kopi gula aren + susu kental manis ekstra" tiap hari, haha. Yang paling penting sesuaikan sama total targetmu (${targetKcal} kcal) dan kasih jeda sebelum jam tidur biar malamnya nggak begadang. Kamu biasanya ngopi jam berapa dan pakai tambahan apa?`,
          `Nggak perlu anti sama kopi cuma karena lagi atur pola makan. Selama waktunya cukup jauh dari jam tidur dan kalorinya masih masuk akal di target ${targetKcal} kcal, aman-aman saja. Hari ini sudah ngopi berapa gelas?`,
        ],
        seed
      );
    }

    // 1. Rendang / Gulai / Santan / Makan malam
    if (
      q.includes("rendang") ||
      q.includes("gulai") ||
      q.includes("santan") ||
      q.includes("bersantan") ||
      q.includes("nasi")
    ) {
      return pickVariant(
        [
          `${CORE_BELIEF_ID}\n\nRendang, gulai, atau nasi itu nggak otomatis bikin diet gagal kok. Yang bikin kalorinya melonjak biasanya porsi kuah berminyaknya ditambah nasi sepiring penuh plus gorengan atau es manis sekaligus. Kalau mau nikmatin, ambil porsi lauk sewajarnya, tiriskan kelebihan minyak di kuah, dan tambah sayur biar kenyangnya lebih pas. Tadi siang sudah makan apa saja?`,
          `Jujur, memusuhi makanan bersantan atau nasi justru sering bikin ujung-ujungnya balas dendam makan di akhir pekan. Kuncinya ada di porsi dan keseimbangan seharian, bukan mengharamkan satu jenis makanan. Kamu mau makan ini buat siang atau malam, dan biasanya porsinya seberapa?`,
        ],
        seed
      );
    }

    // 2. Hidrasi / Minum air / Begah
    if (
      q.includes("air") ||
      q.includes("hidrasi") ||
      q.includes("begah") ||
      (q.includes("minum") && !q.includes("kopi") && !q.includes("teh"))
    ) {
      return pickVariant(
        [
          `Wajar banget kalau langsung minum banyak bikin perut begah—lambung juga butuh waktu, bukan tangki bensin yang tinggal diguyur penuh, hehe. Targetmu ${waterTarget} ml (baru masuk ${loggedWater} ml, sisa ${remainingWater} ml). Coba cicil saja 150–200 ml tiap 1–2 jam mulai sekarang. Seharian ini lebih banyak duduk di ruangan AC atau lagi banyak gerak?`,
          `Nggak usah dipaksa habisin sekaligus kalau bikin begah. Dengan sisa ${remainingWater} ml dari target ${waterTarget} ml, nyicil per gelas kecil tiap beberapa jam jauh lebih nyaman buat perut. Biasanya paling gampang lupa minum pas lagi sibuk kerja atau pas lagi di jalan?`,
        ],
        seed
      );
    }

    // 3. Menu makan siang / Tinggi protein
    if (
      q.includes("makan siang") ||
      q.includes("lunch") ||
      q.includes("protein") ||
      q.includes("menu")
    ) {
      return pickVariant(
        [
          `Untuk makan siang, enaknya pilih kombinasi yang bikin kenyang lama tanpa bikin ngantuk berat—misalnya nasi porsi sedang, sumber protein seperti ayam/ikan/telur/tempe-tahu, dan sayur. Target proteinmu sekitar ${proteinG}g dan sisa kalori hari ini kira-kira ${remainingKcal} kcal. Lagi cari menu yang dimasak sendiri di rumah atau beli di luar?`,
          `Nggak perlu bikin menu ribet kalau lagi buru-buru. Cukup pastikan ada protein dan sayur di piringmu biar kenyangnya tahan lebih lama sampai sore, lalu sesuaikan porsinya dengan sisa kalori sekitar ${remainingKcal} kcal. Bahan makanan apa yang paling gampang kamu siapkan hari ini?`,
        ],
        seed
      );
    }

    // 4. Latihan / Lari / Jalan / Beban / Smartwatch
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
      return pickVariant(
        [
          `Mulai latihan itu yang paling penting masuk ritme dulu, bukan langsung gas pol sampai besoknya nggak bisa jalan. Kombinasi jalan kaki/jogging ringan dan latihan beban dasar beberapa kali seminggu sudah cukup kuat buat fondasi. Kalau pakai jam olahraga, anggap saja angka kalorinya sebagai perkiraan kasar, bukan patokan mutlak. Seminggu ini kamu realistisnya bisa meluangkan waktu berapa hari dan berapa menit per sesi?`,
          `Jadwal latihan yang bagus itu jadwal yang benar-benar bisa kamu jalani tiap minggu, bukan yang paling kelihatan ambisius di kertas. Selipkan hari jeda supaya otot dan sendi punya waktu pulih. Kamu lebih cocok latihan di rumah, di luar, atau di gym?`,
        ],
        seed
      );
    }

    // 5. Kalori / diet / defisit / takut gemuk
    if (
      q.includes("kalori") ||
      q.includes("diet") ||
      q.includes("defisit") ||
      q.includes("gemuk") ||
      q.includes("takut")
    ) {
      return pickVariant(
        [
          `${CORE_BELIEF_ID}\n\nTargetmu sekarang ${targetKcal} kcal, baru tercatat ${loggedKcal} kcal (sisa sekitar ${remainingKcal} kcal). Defisit terlalu ekstrem itu biasanya cuma bikin gampang lemas dan ujung-ujungnya kebablasan makan. Tujuan utamamu sekarang lagi mau turun BB, jaga berat badan, atau naikin massa otot?`,
          `Angka kalori itu alat bantu, bukan vonis salah-benar setiap suapan. Kalau hari ini baru masuk ${loggedKcal} kcal dari target ${targetKcal} kcal, fokus saja ke pola makan yang masih bisa kamu pertahankan minggu depan juga. Belakangan ini apa yang paling sering bikin rencana makanmu goyah?`,
        ],
        seed
      );
    }

    // 6. Pertanyaan umum lainnya
    return pickVariant(
      [
        `${CORE_BELIEF_ID}\n\nTarget harianmu saat ini ${targetKcal} kcal (baru tercatat ${loggedKcal} kcal). Ceritakan saja kondisi yang lagi kamu hadapi sekarang—entah soal makanan tertentu, rasa lapar/begah, atau rutinitas latihan. Hari ini fokus utamamu lagi mau beresin bagian mana dulu?`,
        `Aku siap bantu mikirin solusinya pelan-pelan sesuai kondisi tubuhmu sekarang (target ${targetKcal} kcal, sisa sekitar ${remainingKcal} kcal). Coba cerita lebih spesifik: lagi mikirin soal makan, minum, atau jadwal latihan?`,
      ],
      seed
    );
  }

  // Fallback Bahasa Inggris dengan gaya yang sama
  if (q.includes("coffee") || q.includes("caffeine") || q.includes("sleep")) {
    return `${CORE_BELIEF_EN}\n\nHaving coffee late in the evening can mess with your sleep quality, and poor sleep often makes hunger harder to manage the next day. Enjoying it earlier in the day with light add-ins usually works much better. Around what time do you usually go to bed?`;
  }

  return `${CORE_BELIEF_EN}\n\nYour current daily target is ${targetKcal} kcal (${loggedKcal} kcal logged, about ${remainingKcal} kcal left). Tell me what's on your mind today—meals, hydration, or workouts—and what your main goal is right now?`;
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
      const isId = context.lang !== "en";
      const systemInstruction = [
        "You are FitMate AI Coach, a warm, grounded fitness and nutrition coach.",
        isId
          ? `Core principle: "${CORE_BELIEF_ID}"`
          : `Core principle: "${CORE_BELIEF_EN}"`,
        "Communication rules:",
        "- Talk naturally like a real WhatsApp chat—warm, conversational, and direct, not stiff customer-support templates.",
        "- Do NOT default to bulleted lists or repeated formulaic sections like 'Solusi praktis' / 'Tips & trik'. Use plain conversational paragraphs; only use a short list when comparing 2-3 clear options.",
        "- Light, natural humor is welcome when appropriate, never forced.",
        "- Gently and clearly correct diet misconceptions or food fears when they come up, grounding advice in overall habits and the user's targets.",
        "- Never repeat the same motivational sign-off every turn.",
        "- End with a single specific, helpful follow-up question.",
        `Respond in ${isId ? "Indonesian" : "English"}.`,
        `User context: ${JSON.stringify({
          calorieTarget: context.calorieTarget,
          proteinTarget: context.proteinTarget,
          carbsTarget: context.carbsTarget,
          fatsTarget: context.fatsTarget,
          waterTarget: context.waterTarget,
          loggedCalories: context.loggedCalories,
          loggedWater: context.loggedWater,
          weightKg: context.weightKg,
          heightCm: context.heightCm,
          bmi: context.bmi,
          goal: context.goal,
        })}`,
      ].join("\n");

      const priorTurns = Array.isArray(context.history)
        ? context.history
            .slice(-6)
            .map((item) => {
              const rawText = String(item?.content ?? item?.text ?? "").trim();
              if (!rawText) return null;
              const role =
                item?.role === "assistant" || item?.role === "model"
                  ? "model"
                  : "user";
              return { role, parts: [{ text: rawText }] };
            })
            .filter(
              (turn): turn is { role: "user" | "model"; parts: { text: string }[] } =>
                turn !== null
            )
        : [];

      const contents = [
        ...priorTurns,
        { role: "user" as const, parts: [{ text: message }] },
      ];

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
            contents,
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