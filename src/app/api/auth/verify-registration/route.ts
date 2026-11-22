import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateMemberTargets,
  MemberProfileInput,
  normalizeMemberProfile,
} from "@/lib/member-profile";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashToken(email: string, code: string): string {
  const secret = process.env.VERIFICATION_TOKEN_SECRET || "fitmate-dev-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

async function sendRegistrationSuccessEmail(params: {
  toEmail: string;
  fullName: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  workoutTitle: string;
  bmi: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.FITMATE_FROM_EMAIL || "FitMate <onboarding@resend.dev>";

  if (!apiKey) {
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.toEmail],
      subject: "Pendaftaran FitMate Berhasil — Rencana Targetmu Sudah Aktif!",
      html: `
        <div style="font-family: Arial, sans-serif; background: #0B0D0C; color: #FFFFFF; padding: 28px; border-radius: 16px;">
          <h2 style="margin: 0 0 8px; color: #9EF01A;">Pendaftaran Berhasil</h2>
          <p style="margin: 0 0 14px; color: #E5E7EB;">Halo ${params.fullName},</p>
          <p style="margin: 0 0 18px; color: #D1D5DB; line-height: 1.6;">
            Email kamu sudah terverifikasi dan akun <strong>FitMate</strong> kamu aktif. Target kalori, makro, serta fokus latihan sudah disesuaikan otomatis dari profil tubuhmu:
          </p>
          <div style="background: #161A18; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; margin-bottom: 18px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>BMI Awal:</strong> ${params.bmi}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Target Kalori Harian:</strong> <span style="color: #9EF01A;">${params.dailyCalories} kcal</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Makro (P / K / L):</strong> ${params.proteinGrams}g / ${params.carbsGrams}g / ${params.fatsGrams}g</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Fokus Jenis Latihan:</strong> ${params.workoutTitle}</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #9CA3AF;">Selamat memulai rutinitas sehatmu bersama FitMate.</p>
        </div>
      `,
    }),
  });

  return res.ok;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const profileInput = (body?.profile ?? {}) as MemberProfileInput;

    const email = String(profileInput.email ?? "").trim().toLowerCase();
    const fullName = String(profileInput.full_name ?? "").trim();
    const wa = String(profileInput.whatsapp_phone ?? "").trim();

    if (!fullName || !email || !wa) {
      return NextResponse.json(
        { error: "Data identitas, email, dan nomor WhatsApp wajib lengkap." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: "Masukkan 6 digit kode verifikasi yang valid." },
        { status: 400 }
      );
    }

    const expectedHash = hashToken(email, token);
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { data: latestCodeRow } = await supabase
        .from("email_verification_codes")
        .select("id, token_hash, expires_at, verified_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestCodeRow) {
        return NextResponse.json(
          {
            error:
              "Kode verifikasi belum dikirim atau sudah tidak berlaku. Kirim ulang kode.",
          },
          { status: 400 }
        );
      }

      if (latestCodeRow.verified_at) {
        return NextResponse.json(
          {
            error:
              "Kode verifikasi ini sudah digunakan. Kirim kode baru bila perlu.",
          },
          { status: 400 }
        );
      }

      const isExpired =
        new Date(latestCodeRow.expires_at).getTime() < Date.now();
      if (isExpired) {
        return NextResponse.json(
          {
            error:
              "Kode verifikasi sudah kedaluwarsa. Silakan kirim ulang kode.",
          },
          { status: 400 }
        );
      }

      const hashMatches = crypto.timingSafeEqual(
        Buffer.from(latestCodeRow.token_hash),
        Buffer.from(expectedHash)
      );

      if (!hashMatches) {
        return NextResponse.json(
          { error: "Kode token verifikasi tidak sesuai." },
          { status: 400 }
        );
      }

      await supabase
        .from("email_verification_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", latestCodeRow.id);
    }

    const normalized = normalizeMemberProfile({
      ...profileInput,
      email,
      full_name: fullName,
      whatsapp_phone: wa,
      onboarding_completed: true,
    });

    const computed = calculateMemberTargets({
      age: normalized.age,
      gender: normalized.gender,
      height_cm: normalized.height_cm,
      weight_kg: normalized.weight_kg,
      activity_level: normalized.activity_level,
      goal: normalized.goal,
      waist_circumference_cm: normalized.waist_circumference_cm,
      abdomen_circumference_cm: normalized.abdomen_circumference_cm,
    });

    let savedProfile = normalized;

    if (supabase) {
      const { data: upserted } = await supabase
        .from("member_profiles")
        .upsert(
          {
            device_key: normalized.device_key || null,
            full_name: normalized.full_name,
            display_name: normalized.display_name,
            email: normalized.email,
            whatsapp_phone: normalized.whatsapp_phone,
            social_platform: normalized.social_platform,
            social_handle: normalized.social_handle,
            auto_share_enabled: normalized.auto_share_enabled,
            age: normalized.age,
            gender: normalized.gender,
            height_cm: normalized.height_cm,
            weight_kg: normalized.weight_kg,
            activity_level: normalized.activity_level,
            goal: normalized.goal,
            head_circumference_cm: normalized.head_circumference_cm ?? null,
            neck_circumference_cm: normalized.neck_circumference_cm ?? null,
            abdomen_circumference_cm:
              normalized.abdomen_circumference_cm ?? null,
            waist_circumference_cm: normalized.waist_circumference_cm ?? null,
            arm_circumference_cm: normalized.arm_circumference_cm ?? null,
            bmi: normalized.bmi,
            daily_calories: normalized.daily_calories,
            protein_grams: normalized.protein_grams,
            carbs_grams: normalized.carbs_grams,
            fats_grams: normalized.fats_grams,
            water_ml: normalized.water_ml,
            recommended_workout_mode: normalized.recommended_workout_mode,
            onboarding_completed: true,
          },
          { onConflict: "device_key" }
        )
        .select("*")
        .single();

      if (upserted) {
        savedProfile = normalizeMemberProfile(upserted as MemberProfileInput);
      }
    }

    const confirmationEmailSent = await sendRegistrationSuccessEmail({
      toEmail: savedProfile.email,
      fullName: savedProfile.full_name,
      dailyCalories: savedProfile.daily_calories,
      proteinGrams: savedProfile.protein_grams,
      carbsGrams: savedProfile.carbs_grams,
      fatsGrams: savedProfile.fats_grams,
      workoutTitle: computed.recommendedPlanTitleId,
      bmi: computed.bmi,
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      confirmationEmailSent,
      profile: savedProfile,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memverifikasi token pendaftaran." },
      { status: 500 }
    );
  }
}