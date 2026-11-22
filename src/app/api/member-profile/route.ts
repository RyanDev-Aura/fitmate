import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  MemberProfileInput,
  normalizeMemberProfile,
} from "@/lib/member-profile";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceOrAnonKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceOrAnonKey) {
    return null;
  }

  return createClient(url, serviceOrAnonKey, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceKey = searchParams.get("deviceKey")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!deviceKey && !email) {
      return NextResponse.json({ profile: null });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ profile: null, offline: true });
    }

    let query = supabase.from("member_profiles").select("*").limit(1);

    if (deviceKey) {
      query = query.eq("device_key", deviceKey);
    } else if (email) {
      query = query.eq("email", email);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: normalizeMemberProfile(data as MemberProfileInput),
    });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MemberProfileInput;

    if (
      !body?.full_name?.trim() ||
      !body?.email?.trim() ||
      !body?.whatsapp_phone?.trim()
    ) {
      return NextResponse.json(
        { error: "Nama lengkap, email, dan nomor WhatsApp aktif wajib diisi." },
        { status: 400 }
      );
    }

    const normalized = normalizeMemberProfile({
      ...body,
      onboarding_completed: true,
    });

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        profile: normalized,
        savedLocalOnly: true,
      });
    }

    const payload = {
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
      abdomen_circumference_cm: normalized.abdomen_circumference_cm ?? null,
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
    };

    const { data, error } = await supabase
      .from("member_profiles")
      .upsert(payload, {
        onConflict: "device_key",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({
        profile: normalized,
        savedLocalOnly: true,
        warning: error.message,
      });
    }

    return NextResponse.json({
      profile: normalizeMemberProfile(data as MemberProfileInput),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses registrasi profil member." },
      { status: 500 }
    );
  }
}