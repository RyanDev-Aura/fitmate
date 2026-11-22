"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MEMBER_PROFILE_STORAGE_KEY,
  MemberActivityLevel,
  MemberGender,
  MemberGoal,
  MemberProfileRecord,
  SocialPlatform,
  calculateMemberTargets,
  getOrCreateDeviceKey,
  loadLocalMemberProfile,
  saveLocalMemberProfile,
} from "@/lib/member-profile";

const LEGACY_PROFILE_KEY = "fitmate_profile_settings_v1";

interface MemberOnboardingGateProps {
  lang?: "id" | "en";
  children: (ctx: {
    profile: MemberProfileRecord;
    openEditProfile: () => void;
    logout: () => void;
  }) => React.ReactNode;
}

export default function MemberOnboardingGate({
  lang = "id",
  children,
}: MemberOnboardingGateProps) {
  const isId = lang !== "en";

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [profile, setProfile] = useState<MemberProfileRecord | null>(null);
  const [checking, setChecking] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingToken, setSendingToken] = useState(false);
  const [tokenStepActive, setTokenStepActive] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [socialPlatform, setSocialPlatform] =
    useState<SocialPlatform>("instagram");
  const [socialHandle, setSocialHandle] = useState("");
  const [autoShareEnabled, setAutoShareEnabled] = useState(true);

  const [age, setAge] = useState("27");
  const [gender, setGender] = useState<MemberGender>("male");
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("68");
  const [activityLevel, setActivityLevel] =
    useState<MemberActivityLevel>("moderate");
  const [goal, setGoal] = useState<MemberGoal>("recomp");

  const [headCm, setHeadCm] = useState("");
  const [neckCm, setNeckCm] = useState("");
  const [abdomenCm, setAbdomenCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [armCm, setArmCm] = useState("");

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(MEMBER_PROFILE_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_PROFILE_KEY);
      } catch {
        // Abaikan jika storage diblokir
      }
      window.dispatchEvent(new CustomEvent("fitmate:logout"));
    }
    setProfile(null);
    setIsEditing(false);
    setTokenStepActive(false);
    setVerificationToken("");
    setInfoMsg("");
    setErrorMsg("");
    setAuthMode("login");
  }, []);

  function hydrateFormFromProfile(p: MemberProfileRecord) {
    setFullName(p.full_name || "");
    setDisplayName(p.display_name || "");
    setEmail(p.email || "");
    setWhatsappPhone(p.whatsapp_phone || "");
    setSocialPlatform(p.social_platform || "instagram");
    setSocialHandle(p.social_handle || "");
    setAutoShareEnabled(p.auto_share_enabled ?? true);

    setAge(String(p.age ?? 27));
    setGender(p.gender || "male");
    setHeightCm(String(p.height_cm ?? 170));
    setWeightKg(String(p.weight_kg ?? 68));
    setActivityLevel(p.activity_level || "moderate");
    setGoal(p.goal || "recomp");

    setHeadCm(p.head_circumference_cm ? String(p.head_circumference_cm) : "");
    setNeckCm(p.neck_circumference_cm ? String(p.neck_circumference_cm) : "");
    setAbdomenCm(
      p.abdomen_circumference_cm ? String(p.abdomen_circumference_cm) : ""
    );
    setWaistCm(p.waist_circumference_cm ? String(p.waist_circumference_cm) : "");
    setArmCm(p.arm_circumference_cm ? String(p.arm_circumference_cm) : "");
  }

  useEffect(() => {
    let mounted = true;

    async function initProfile() {
      const local = loadLocalMemberProfile();
      if (local && mounted) {
        setProfile(local);
        hydrateFormFromProfile(local);
      }

      try {
        const deviceKey = getOrCreateDeviceKey();
        const res = await fetch(
          `/api/member-profile?deviceKey=${encodeURIComponent(deviceKey)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.profile && mounted && window.localStorage.getItem(MEMBER_PROFILE_STORAGE_KEY)) {
            const synced = saveLocalMemberProfile(data.profile);
            setProfile(synced);
            hydrateFormFromProfile(synced);
          }
        }
      } catch {
        // Gunakan local profile bila offline
      } finally {
        if (mounted) setChecking(false);
      }
    }

    initProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const livePreview = useMemo(() => {
    return calculateMemberTargets({
      age: Number(age) || 27,
      gender,
      height_cm: Number(heightCm) || 170,
      weight_kg: Number(weightKg) || 68,
      activity_level: activityLevel,
      goal,
      waist_circumference_cm: waistCm ? Number(waistCm) : null,
      abdomen_circumference_cm: abdomenCm ? Number(abdomenCm) : null,
    });
  }, [age, gender, heightCm, weightKg, activityLevel, goal, waistCm, abdomenCm]);

  function validateEmailOnly(): boolean {
    setErrorMsg("");
    setInfoMsg("");
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg(
        isId ? "Masukkan alamat email yang valid." : "Please enter a valid email address."
      );
      return false;
    }
    return true;
  }

  function validateRegisterFields(): boolean {
    if (!validateEmailOnly()) return false;

    const cleanName = fullName.trim();
    const cleanWa = whatsappPhone.trim();

    if (!cleanName || !cleanWa) {
      setErrorMsg(
        isId
          ? "Lengkapi Nama Lengkap, Email, dan Nomor WhatsApp aktif terlebih dahulu."
          : "Please fill in your Full Name, Email, and active WhatsApp number."
      );
      return false;
    }

    const numericDigitsWa = cleanWa.replace(/\D/g, "");
    if (numericDigitsWa.length < 9) {
      setErrorMsg(
        isId
          ? "Nomor WhatsApp aktif minimal 9 digit."
          : "Please enter a valid active WhatsApp number."
      );
      return false;
    }

    return true;
  }

  function buildDraftProfile() {
    const cleanName = fullName.trim();
    const deviceKey = getOrCreateDeviceKey();
    return {
      device_key: deviceKey,
      full_name: cleanName,
      display_name: displayName.trim() || cleanName.split(" ")[0],
      email: email.trim().toLowerCase(),
      whatsapp_phone: whatsappPhone.trim(),
      social_platform: socialPlatform,
      social_handle: socialHandle.trim().replace(/^@+/, ""),
      auto_share_enabled: autoShareEnabled,
      age: Number(age) || 27,
      gender,
      height_cm: Number(heightCm) || 170,
      weight_kg: Number(weightKg) || 68,
      activity_level: activityLevel,
      goal,
      head_circumference_cm: headCm ? Number(headCm) : null,
      neck_circumference_cm: neckCm ? Number(neckCm) : null,
      abdomen_circumference_cm: abdomenCm ? Number(abdomenCm) : null,
      waist_circumference_cm: waistCm ? Number(waistCm) : null,
      arm_circumference_cm: armCm ? Number(armCm) : null,
      onboarding_completed: true,
    };
  }

  async function handleSendVerificationToken() {
    const valid =
      authMode === "login" && !isEditing
        ? validateEmailOnly()
        : validateRegisterFields();
    if (!valid) return;

    setSendingToken(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      const deviceKey = getOrCreateDeviceKey();
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim() || "Member",
          deviceKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "Gagal mengirim kode token ke email.");
        return;
      }

      setTokenStepActive(true);
      setInfoMsg(
        data?.devTokenPreview
          ? `Kode verifikasi 6 digit dibuat (mode lokal tanpa RESEND_API_KEY): ${data.devTokenPreview}`
          : `Kode verifikasi 6 digit telah dikirim ke ${email.trim().toLowerCase()}. Cek inbox atau folder spam.`
      );
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan saat mengirim kode token.");
    } finally {
      setSendingToken(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEditing && profile) {
      if (!validateRegisterFields()) return;
      setSaving(true);
      try {
        const draft = buildDraftProfile();
        const localSaved = saveLocalMemberProfile(draft);
        let finalProfile = localSaved;

        try {
          const res = await fetch("/api/member-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localSaved),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.profile) {
              finalProfile = saveLocalMemberProfile(data.profile);
            }
          }
        } catch {
          // Gunakan localSaved jika offline
        }

        setProfile(finalProfile);
        setIsEditing(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("fitmate:profile-updated", { detail: finalProfile })
          );
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    const valid =
      authMode === "login" ? validateEmailOnly() : validateRegisterFields();
    if (!valid) return;

    if (!tokenStepActive) {
      await handleSendVerificationToken();
      return;
    }

    if (!/^\d{6}$/.test(verificationToken.trim())) {
      setErrorMsg(
        isId
          ? "Masukkan 6 digit kode token yang dikirim ke emailmu."
          : "Please enter the 6-digit verification token sent to your email."
      );
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const endpoint =
        authMode === "login"
          ? "/api/auth/login-verify"
          : "/api/auth/verify-registration";

      const payload =
        authMode === "login"
          ? {
              email: email.trim().toLowerCase(),
              token: verificationToken.trim(),
              deviceKey: getOrCreateDeviceKey(),
            }
          : {
              token: verificationToken.trim(),
              profile: buildDraftProfile(),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data?.profile) {
        setErrorMsg(
          data?.error ||
            (isId
              ? "Kode token tidak valid atau sudah kedaluwarsa."
              : "Invalid or expired verification token.")
        );
        return;
      }

      const finalProfile = saveLocalMemberProfile(data.profile);
      setProfile(finalProfile);
      hydrateFormFromProfile(finalProfile);
      setTokenStepActive(false);
      setVerificationToken("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fitmate:profile-updated", { detail: finalProfile })
        );
      }
    } catch {
      setErrorMsg("Gagal memproses verifikasi.");
    } finally {
      setSaving(false);
    }
  }

  if (checking && !profile) {
    return (
      <div className="min-h-screen bg-[#0B0D0C] text-white flex items-center justify-center px-5">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#9EF01A] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-neutral-400">
            {isId ? "Memuat profil member FitMate..." : "Loading FitMate member profile..."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !profile.onboarding_completed || isEditing) {
    return (
      <div className="min-h-screen bg-[#0B0D0C] text-white py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="relative w-[132px] h-[34px]">
              <Image
                src="/fitmate-logo-icon.jpg"
                alt="FitMate"
                fill
                sizes="132px"
                className="object-contain object-left"
                priority
              />
            </div>

            {!isEditing ? (
              <div className="flex items-center gap-1 bg-[#161A18] p-1 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setTokenStepActive(false);
                    setErrorMsg("");
                    setInfoMsg("");
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    authMode === "register"
                      ? "bg-[#9EF01A] text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {isId ? "Daftar Baru" : "Register"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setTokenStepActive(false);
                    setErrorMsg("");
                    setInfoMsg("");
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    authMode === "login"
                      ? "bg-[#9EF01A] text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {isId ? "Log In" : "Log In"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl bg-[#161A18] border border-white/15 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
              >
                {isId ? "Batal" : "Cancel"}
              </button>
            )}
          </div>

          {/* Intro */}
          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#9EF01A]/15 text-[#9EF01A] border border-[#9EF01A]/30">
              {isEditing
                ? isId
                  ? "Edit Profil & Kalibrasi Ulang"
                  : "Edit Profile & Recalibrate"
                : authMode === "login"
                ? isId
                  ? "Masuk Akun Member Terdaftar"
                  : "Existing Member Log In"
                : isId
                ? "Registrasi & Verifikasi Token Email"
                : "Registration & Email Token Verification"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isEditing
                ? isId
                  ? "Perbarui Profil & Ukuran Tubuh"
                  : "Update Profile & Body Measurements"
                : authMode === "login"
                ? isId
                  ? "Log In ke Akun FitMate Kamu"
                  : "Log In to Your FitMate Account"
                : isId
                ? "Daftar Member FitMate Terlebih Dahulu"
                : "Complete Your FitMate Registration"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              {authMode === "login" && !isEditing
                ? isId
                  ? "Masukkan email yang sudah terdaftar untuk menerima kode verifikasi 6 digit dan memuat kembali data profil serta targetmu."
                  : "Enter your registered email to receive a 6-digit verification code and load your profile and targets."
                : isId
                ? "Isi data profil, verifikasi kode token ke emailmu, lalu target kalori & jenis latihan langsung tersesuaikan otomatis."
                : "Fill your profile, verify the email token, and your calorie targets and workout focus will calibrate automatically."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {authMode === "login" && !isEditing ? (
              <div className="bg-[#161A18] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">
                    {isId ? "Email Terdaftar *" : "Registered Email *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setTokenStepActive(false);
                    }}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Section 1: Identitas, Kontak & Sosial Media */}
                <div className="bg-[#161A18] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-[#9EF01A] uppercase tracking-wider">
                    {isId
                      ? "1. Identitas, WhatsApp & Sosial Media"
                      : "1. Identity, WhatsApp & Social Media"}
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Nama Lengkap *" : "Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isId ? "Contoh: Budi Santoso" : "e.g. Alex Morgan"}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Nama Panggilan" : "Nickname"}
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isId ? "Contoh: Budi" : "e.g. Alex"}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Email Aktif *" : "Active Email *"}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (!isEditing) setTokenStepActive(false);
                        }}
                        placeholder="nama@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Nomor WhatsApp Aktif *" : "Active WhatsApp Number *"}
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Platform Sosial Media" : "Social Media Platform"}
                      </label>
                      <select
                        value={socialPlatform}
                        onChange={(e) =>
                          setSocialPlatform(e.target.value as SocialPlatform)
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="x">X (Twitter)</option>
                        <option value="youtube">YouTube</option>
                        <option value="other">Lainnya / Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Username / Handle Sosmed" : "Social Handle"}
                      </label>
                      <input
                        type="text"
                        value={socialHandle}
                        onChange={(e) => setSocialHandle(e.target.value)}
                        placeholder="@usernamekamu"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoShareEnabled}
                      onChange={(e) => setAutoShareEnabled(e.target.checked)}
                      className="mt-0.5 accent-[#9EF01A]"
                    />
                    <span className="text-xs text-neutral-300 leading-relaxed">
                      {isId
                        ? "Siapkan kartu & caption progres (BMI, kalori, latihan) siap bagikan ke sosial media saya dengan identitas FitMate."
                        : "Prepare share-ready progress cards & captions (BMI, calories, workouts) for my social media with FitMate branding."}
                    </span>
                  </label>
                </div>

                {/* Section 2: Profil Dasar & Tujuan */}
                <div className="bg-[#161A18] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-[#9EF01A] uppercase tracking-wider">
                    {isId
                      ? "2. Data Tubuh Dasar & Tujuan Latihan"
                      : "2. Core Body Metrics & Training Goal"}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Usia (th) *" : "Age (yrs) *"}
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={110}
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Kelamin *" : "Gender *"}
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as MemberGender)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      >
                        <option value="male">{isId ? "Laki-laki" : "Male"}</option>
                        <option value="female">{isId ? "Perempuan" : "Female"}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Tinggi / TB (cm) *" : "Height (cm) *"}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={100}
                        max={250}
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Berat / BB (kg) *" : "Weight (kg) *"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={25}
                        max={350}
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Aktivitas Harian" : "Daily Activity Level"}
                      </label>
                      <select
                        value={activityLevel}
                        onChange={(e) =>
                          setActivityLevel(e.target.value as MemberActivityLevel)
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      >
                        <option value="sedentary">
                          {isId ? "Jarang olahraga (kerja duduk)" : "Sedentary"}
                        </option>
                        <option value="light">
                          {isId ? "Ringan (1–2x/minggu)" : "Light (1–2x/week)"}
                        </option>
                        <option value="moderate">
                          {isId ? "Sedang (3–4x/minggu)" : "Moderate (3–4x/week)"}
                        </option>
                        <option value="active">
                          {isId ? "Aktif (5x/minggu)" : "Active (5x/week)"}
                        </option>
                        <option value="very_active">
                          {isId ? "Sangat aktif / fisik berat" : "Very Active"}
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Fokus Tujuan Utama" : "Primary Goal"}
                      </label>
                      <select
                        value={goal}
                        onChange={(e) => setGoal(e.target.value as MemberGoal)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      >
                        <option value="fat_loss">
                          {isId ? "Turun Berat Badan / Fat Loss" : "Fat Loss"}
                        </option>
                        <option value="recomp">
                          {isId ? "Jaga BB & Bentuk Tubuh (Recomp)" : "Body Recomposition"}
                        </option>
                        <option value="muscle_gain">
                          {isId ? "Naikkan Massa Otot (Bulking)" : "Muscle Gain"}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Ukuran Lingkar Tubuh */}
                <div className="bg-[#161A18] border border-white/10 rounded-2xl p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#9EF01A] uppercase tracking-wider">
                      {isId
                        ? "3. Ukuran Lingkar Tubuh (cm)"
                        : "3. Body Circumference Measurements (cm)"}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {isId
                        ? "Isi ukuran lingkar tubuh untuk pemantauan progres proporsi tubuh dari minggu ke minggu."
                        : "Enter body circumferences to track body proportion progress over time."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Lingkar Kepala" : "Head (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={20}
                        max={100}
                        value={headCm}
                        onChange={(e) => setHeadCm(e.target.value)}
                        placeholder="56"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Lingkar Leher" : "Neck (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={20}
                        max={80}
                        value={neckCm}
                        onChange={(e) => setNeckCm(e.target.value)}
                        placeholder="37"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Lingkar Perut" : "Abdomen (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={40}
                        max={220}
                        value={abdomenCm}
                        onChange={(e) => setAbdomenCm(e.target.value)}
                        placeholder="84"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Lingkar Pinggang" : "Waist (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={40}
                        max={220}
                        value={waistCm}
                        onChange={(e) => setWaistCm(e.target.value)}
                        placeholder="80"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">
                        {isId ? "Lingkar Lengan" : "Arm (cm)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={15}
                        max={80}
                        value={armCm}
                        onChange={(e) => setArmCm(e.target.value)}
                        placeholder="31"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm text-white focus:outline-none focus:border-[#9EF01A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Hasil Kalibrasi Otomatis */}
                <div className="bg-[#161A18] border border-[#9EF01A]/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9EF01A]">
                      {isId
                        ? "Preview Rencana Otomatis Dari Profilmu"
                        : "Auto-Calibrated Plan Preview"}
                    </span>
                    <span className="text-xs font-semibold text-neutral-300">
                      BMI {livePreview.bmi} (
                      {isId ? livePreview.bmiCategoryId : livePreview.bmiCategoryEn})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-neutral-400">
                        {isId ? "Target Kalori" : "Daily Calories"}
                      </p>
                      <p className="text-base font-extrabold text-[#9EF01A] mt-0.5">
                        {livePreview.dailyCalories} kcal
                      </p>
                    </div>
                    <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-neutral-400">
                        Protein / Karbo / Lemak
                      </p>
                      <p className="text-xs font-bold text-white mt-1">
                        {livePreview.proteinGrams}g • {livePreview.carbsGrams}g •{" "}
                        {livePreview.fatsGrams}g
                      </p>
                    </div>
                    <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-neutral-400">
                        {isId ? "Target Hidrasi" : "Hydration"}
                      </p>
                      <p className="text-base font-extrabold text-white mt-0.5">
                        {livePreview.waterMl} ml
                      </p>
                    </div>
                    <div className="bg-[#0B0D0C] border border-white/10 rounded-xl p-3">
                      <p className="text-[11px] text-neutral-400">
                        {isId ? "Jenis Latihan" : "Workout Focus"}
                      </p>
                      <p className="text-xs font-bold text-[#9EF01A] mt-1">
                        {isId
                          ? livePreview.recommendedPlanTitleId
                          : livePreview.recommendedPlanTitleEn}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Kotak Verifikasi Token Email */}
            {!isEditing && tokenStepActive && (
              <div className="bg-[#161A18] border border-[#9EF01A] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#9EF01A]">
                    {isId
                      ? "Masukkan Kode Token Verifikasi Email (6 Digit)"
                      : "Enter 6-Digit Email Verification Token"}
                  </h3>
                  <button
                    type="button"
                    disabled={sendingToken}
                    onClick={handleSendVerificationToken}
                    className="text-xs font-bold text-[#9EF01A] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {sendingToken
                      ? isId
                        ? "Mengirim..."
                        : "Sending..."
                      : isId
                      ? "Kirim Ulang Token"
                      : "Resend Token"}
                  </button>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationToken}
                  onChange={(e) =>
                    setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0D0C] border border-white/20 text-center text-xl font-extrabold tracking-[0.35em] text-[#9EF01A] focus:outline-none focus:border-[#9EF01A]"
                />
              </div>
            )}

            {infoMsg && (
              <div className="px-4 py-3 rounded-xl bg-[#9EF01A]/15 border border-[#9EF01A]/40 text-xs text-[#E5FFBA]">
                {infoMsg}
              </div>
            )}

            {errorMsg && (
              <div className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || sendingToken}
              className="w-full py-3.5 rounded-xl bg-[#9EF01A] text-black font-extrabold text-sm hover:brightness-105 transition disabled:opacity-60 cursor-pointer"
            >
              {saving || sendingToken
                ? isId
                  ? "Memproses..."
                  : "Processing..."
                : isEditing
                ? isId
                  ? "Simpan Perubahan Profil"
                  : "Save Profile Changes"
                : !tokenStepActive
                ? isId
                  ? "Kirim Kode Verifikasi ke Email →"
                  : "Send Verification Token to Email →"
                : authMode === "login"
                ? isId
                  ? "Verifikasi & Log In ke FitMate →"
                  : "Verify & Log In to FitMate →"
                : isId
                ? "Verifikasi Token & Selesaikan Pendaftaran →"
                : "Verify Token & Complete Registration →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {children({
        profile,
        openEditProfile: () => {
          hydrateFormFromProfile(profile);
          setIsEditing(true);
        },
        logout: handleLogout,
      })}
    </>
  );
}