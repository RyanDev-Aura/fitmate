import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function sendOtpEmail(toEmail: string, name: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.FITMATE_FROM_EMAIL || "FitMate <onboarding@resend.dev>";

  if (!apiKey) {
    return { sent: false, previewCode: code };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `Kode Verifikasi FitMate: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #0B0D0C; color: #FFFFFF; padding: 28px; border-radius: 16px;">
          <h2 style="margin: 0 0 8px; color: #9EF01A;">FitMate</h2>
          <p style="margin: 0 0 16px; color: #E5E7EB;">Halo ${name || "Member"},</p>
          <p style="margin: 0 0 16px; color: #D1D5DB;">Gunakan kode token verifikasi berikut untuk menyelesaikan pendaftaran/masuk akun FitMate Anda (berlaku 10 menit):</p>
          <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; background: #161A18; color: #9EF01A; padding: 14px 20px; border-radius: 12px; display: inline-block; border: 1px solid rgba(158,240,26,0.35);">
            ${code}
          </div>
          <p style="margin: 20px 0 0; font-size: 12px; color: #9CA3AF;">Jika Anda tidak merasa meminta kode ini, abaikan email ini.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Gagal mengirim email verifikasi");
  }

  return { sent: true, previewCode: undefined };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const fullName = String(body?.fullName ?? "").trim() || "Member";
    const deviceKey = String(body?.deviceKey ?? "").trim() || null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Alamat email tidak valid." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Konfigurasi Supabase belum terbaca di .env.local." },
        { status: 500 }
      );
    }

    const code = String(crypto.randomInt(100000, 999999));
    const tokenHash = hashToken(email, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        device_key: deviceKey,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    const mailResult = await sendOtpEmail(email, fullName, code);

    return NextResponse.json({
      ok: true,
      sent: mailResult.sent,
      expiresInMinutes: 10,
      devTokenPreview: mailResult.previewCode,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengirim kode verifikasi ke email.",
      },
      { status: 500 }
    );
  }
}