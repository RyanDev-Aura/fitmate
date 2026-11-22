import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const token = String(body?.token ?? "").trim();
    const deviceKey = String(body?.deviceKey ?? "").trim() || null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Masukkan alamat email yang valid." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: "Masukkan 6 digit kode verifikasi." },
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
          { error: "Kode verifikasi belum dikirim. Kirim kode terlebih dahulu." },
          { status: 400 }
        );
      }

      if (latestCodeRow.verified_at) {
        return NextResponse.json(
          { error: "Kode verifikasi ini sudah digunakan. Kirim kode baru." },
          { status: 400 }
        );
      }

      if (new Date(latestCodeRow.expires_at).getTime() < Date.now()) {
        return NextResponse.json(
          { error: "Kode verifikasi sudah kedaluwarsa. Kirim ulang kode." },
          { status: 400 }
        );
      }

      const matches = crypto.timingSafeEqual(
        Buffer.from(latestCodeRow.token_hash),
        Buffer.from(expectedHash)
      );

      if (!matches) {
        return NextResponse.json(
          { error: "Kode verifikasi tidak sesuai." },
          { status: 400 }
        );
      }

      await supabase
        .from("email_verification_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", latestCodeRow.id);

      const { data: memberRow } = await supabase
        .from("member_profiles")
        .select("*")
        .ilike("email", email)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!memberRow) {
        return NextResponse.json(
          {
            error:
              "Email ini belum terdaftar sebagai member FitMate. Silakan pilih tab Daftar Baru terlebih dahulu.",
          },
          { status: 404 }
        );
      }

      const normalized = normalizeMemberProfile({
        ...(memberRow as MemberProfileInput),
        device_key: deviceKey || (memberRow as MemberProfileInput).device_key,
        onboarding_completed: true,
      });

      if (deviceKey) {
        await supabase
          .from("member_profiles")
          .update({ device_key: deviceKey })
          .eq("id", memberRow.id);
      }

      return NextResponse.json({
        ok: true,
        profile: normalized,
      });
    }

    return NextResponse.json(
      { error: "Konfigurasi database Supabase belum aktif." },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses log in member." },
      { status: 500 }
    );
  }
}