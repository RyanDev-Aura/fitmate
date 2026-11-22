"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Lang } from "@/lib/i18n";

type FeatureItem = {
  tag: string;
  title: string;
  desc: string;
};

type StepItem = {
  num: string;
  title: string;
  desc: string;
};

type CapabilityItem = {
  label: string;
  value: string;
};

function FitMateLogo() {
  return (
    <div className="flex items-center">
      <div className="relative w-[136px] h-[34px] shrink-0">
        <Image
  src="/fitmate-logo-icon.jpg"
  alt="FitMate Logo"
  fill
  sizes="136px"
  className="object-contain object-left"
  priority
/>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("id");
  const isId = lang === "id";

  const features: FeatureItem[] = isId
    ? [
        {
          tag: "Latihan",
          title: "Hybrid Workout Planner",
          desc: "Gabungkan template latihan terstruktur dengan rencana latihan AI sesuai tujuan dan durasi harian Anda.",
        },
        {
          tag: "Nutrisi",
          title: "Pelacakan Nutrisi & Hidrasi",
          desc: "Pantau asupan kalori, makro (protein, karbo, lemak), dan target minum air harian dengan cepat.",
        },
        {
          tag: "Progres",
          title: "Kalkulator Target & Progres",
          desc: "Hitung kebutuhan kalori dan makro harian dari profil tubuh serta pantau konsistensi mingguan.",
        },
        {
          tag: "AI Coach",
          title: "FitMate AI Coach",
          desc: "Tanya jawab praktis soal menu makan, porsi, penyesuaian target, dan strategi latihan harian.",
        },
      ]
    : [
        {
          tag: "Workout",
          title: "Hybrid Workout Planner",
          desc: "Combine structured workout templates with AI-generated routines tailored to your goal and available time.",
        },
        {
          tag: "Nutrition",
          title: "Nutrition & Hydration Tracking",
          desc: "Track daily calories, macros (protein, carbs, fats), and water intake targets effortlessly.",
        },
        {
          tag: "Progress",
          title: "Target Calculator & Progress",
          desc: "Calculate daily calorie and macro targets from your body profile and track weekly consistency.",
        },
        {
          tag: "AI Coach",
          title: "FitMate AI Coach",
          desc: "Get practical guidance on meal choices, portions, target adjustments, and daily training.",
        },
      ];

  const steps: StepItem[] = isId
    ? [
        {
          num: "01",
          title: "Tentukan Target Tubuh",
          desc: "Atur fokus tujuan, kalori harian, makro, dan kebutuhan air minum.",
        },
        {
          num: "02",
          title: "Jalankan Latihan & Nutrisi",
          desc: "Catat sesi latihan dengan timer istirahat serta log makan dan air harian.",
        },
        {
          num: "03",
          title: "Evaluasi & Naik ke PRO",
          desc: "Pantau progres mingguan dan buka akses penuh AI Coach serta fitur lanjutan.",
        },
      ]
    : [
        {
          num: "01",
          title: "Set Your Body Targets",
          desc: "Configure your primary goal, daily calories, macros, and hydration target.",
        },
        {
          num: "02",
          title: "Log Workouts & Nutrition",
          desc: "Run guided sessions with rest timers and track meals and water intake daily.",
        },
        {
          num: "03",
          title: "Track & Upgrade to PRO",
          desc: "Review weekly consistency and unlock unlimited AI Coach and advanced capabilities.",
        },
      ];

  const capabilities: CapabilityItem[] = isId
    ? [
        {
          label: "Fokus Rutinitas",
          value: "Hybrid Workout + Log Nutrisi & Hidrasi",
        },
        {
          label: "Target Personal",
          value: "Kalori, Makro & Konsistensi Mingguan",
        },
        {
          label: "Asisten Harian",
          value: "FitMate AI Coach Berbasis Target",
        },
      ]
    : [
        {
          label: "Routine Focus",
          value: "Hybrid Workout + Nutrition & Hydration Logs",
        },
        {
          label: "Personal Targets",
          value: "Calories, Macros & Weekly Consistency",
        },
        {
          label: "Daily Companion",
          value: "Target-Aware FitMate AI Coach",
        },
      ];

  return (
    <div className="min-h-screen bg-[#0B0D0C] text-white">
      <div className="max-w-7xl mx-auto px-5">
        {/* Header / Navbar */}
        <header className="flex items-center justify-between gap-3 py-6 border-b border-white/10">
          <Link href="/" aria-label="FitMate Home">
            <FitMateLogo />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-[#161A18] p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setLang("id")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  lang === "id"
                    ? "bg-[#9EF01A] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  lang === "en"
                    ? "bg-[#9EF01A] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            <Link
              href="/app"
              className="px-4 py-2 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 transition"
            >
              {isId ? "Buka Aplikasi" : "Open App"}
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 text-white overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: "url('/hero-gym.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0B0D0C]/95 via-[#0B0D0C]/80 to-[#0B0D0C]" />

        <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-12 gap-8 items-center relative z-20">
          <div className="md:col-span-7 space-y-5">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#9EF01A]/15 text-[#9EF01A] border border-[#9EF01A]/30">
              {isId
                ? "Asisten Latihan, Nutrisi & AI Harian"
                : "Daily Workout, Nutrition & AI Companion"}
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              {isId ? (
                <>
                  Bangun Rutinitas Bugar yang{" "}
                  <span className="text-[#9EF01A]">Terukur & Konsisten</span>
                </>
              ) : (
                <>
                  Build a Fitness Routine That Is{" "}
                  <span className="text-[#9EF01A]">Measured & Consistent</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl">
              {isId
                ? "FitMate menyatukan rencana latihan hybrid, pencatatan kalori & makro, hidrasi harian, kalkulator target, serta Pelatih AI dalam satu alur yang praktis untuk penggunaan sehari-hari."
                : "FitMate brings hybrid workout planning, calorie & macro tracking, daily hydration, target calculation, and AI Coach together in a practical daily workflow."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/app"
                className="px-6 py-4 rounded-xl bg-[#9EF01A] text-black font-bold text-sm hover:brightness-105 transition"
              >
                {isId ? "Mulai Uji Coba Gratis →" : "Start Free Trial →"}
              </Link>
              <a
                href="#plans"
                className="px-6 py-4 rounded-xl bg-[#161A18] border border-white/15 text-white font-semibold text-sm hover:border-white/30 transition"
              >
                {isId ? "Lihat Uji Coba vs PRO" : "Compare Trial vs PRO"}
              </a>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="bg-[#161A18]/85 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9EF01A]">
                  {isId ? "Ringkasan Kapabilitas" : "Capability Overview"}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#9EF01A]/15 text-[#9EF01A] font-semibold">
                  Web + App
                </span>
              </div>

              {capabilities.map((cap, idx) => (
                <div
                  key={cap.label}
                  className="bg-[#0B0D0C]/65 border border-white/10 rounded-2xl p-4"
                >
                  <p className="text-[11px] text-neutral-400">{cap.label}</p>
                  <p
                    className={`text-sm font-bold mt-1.5 ${
                      idx === capabilities.length - 1 ? "text-[#9EF01A]" : "text-white"
                    }`}
                  >
                    {cap.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-5">
        {/* Fitur Inti */}
        <section className="py-12 md:py-16 border-t border-white/10 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9EF01A]">
              {isId ? "Fitur Inti" : "Core Features"}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              {isId
                ? "Semua yang Dibutuhkan untuk Rutinitas Harian"
                : "Everything Needed for a Daily Routine"}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((item) => (
              <div
                key={item.title}
                className="bg-[#161A18] border border-white/10 rounded-2xl p-6 space-y-2.5 flex flex-col"
              >
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#9EF01A]/15 text-[#9EF01A] self-start">
                  {item.tag}
                </span>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed flex-grow">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Cara Kerja */}
        <section className="py-12 md:py-16 border-t border-white/10 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9EF01A]">
              {isId ? "Cara Kerja" : "How It Works"}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              {isId ? "Mulai dalam Tiga Langkah" : "Start in Three Steps"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-[#161A18] border border-white/10 rounded-2xl p-6 space-y-2.5"
              >
                <span className="text-sm font-extrabold text-[#9EF01A] block">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Uji Coba vs PRO */}
        <section
          id="plans"
          className="py-12 md:py-16 border-t border-white/10 space-y-5"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9EF01A]">
              {isId ? "Paket Akses" : "Access Plans"}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              {isId ? "Mode Uji Coba vs FitMate PRO" : "Trial Mode vs FitMate PRO"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-[#161A18] border border-white/10 rounded-2xl p-8 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">
                  {isId ? "Uji Coba (Trial)" : "Trial"}
                </h3>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-neutral-200">
                  {isId ? "7 Hari" : "7 Days"}
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                {isId
                  ? "Cocok untuk mencoba pencatatan harian, target dasar, dan sesi latihan inti."
                  : "Ideal for trying daily logging, basic targets, and core workout sessions."}
              </p>
              <ul className="space-y-3 text-sm text-neutral-300 flex-grow">
                <li>
                  • {isId ? "Log nutrisi, makro & hidrasi harian" : "Daily nutrition, macro & water logs"}
                </li>
                <li>
                  • {isId ? "Kalkulator target & latihan dasar" : "Target calculator & core workouts"}
                </li>
                <li>
                  • {isId ? "Kuota 5 pesan Pelatih AI per hari" : "5 AI Coach messages per day"}
                </li>
              </ul>
              <Link
                href="/app"
                className="block text-center mt-4 py-4 rounded-xl bg-[#0B0D0C] border border-white/15 text-sm font-bold text-white hover:border-[#9EF01A]/50 transition"
              >
                {isId ? "Coba Sekarang" : "Try Now"}
              </Link>
            </div>

            <div className="bg-[#161A18] border border-[#9EF01A]/40 rounded-2xl p-8 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">FitMate PRO</h3>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#9EF01A] text-black">
                  PRO
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                {isId
                  ? "Untuk konsistensi penuh dengan AI Coach tanpa batas dan perencanaan lanjutan."
                  : "Built for full consistency with unlimited AI Coach and advanced planning."}
              </p>
              <ul className="space-y-3 text-sm text-neutral-200 flex-grow">
                <li>
                  •{" "}
                  {isId
                    ? "Chat Pelatih AI tanpa batas harian"
                    : "Unlimited daily AI Coach chats"}
                </li>
                <li>
                  •{" "}
                  {isId
                    ? "Hybrid Workout Planner AI penuh"
                    : "Full AI Hybrid Workout Planner"}
                </li>
                <li>
                  •{" "}
                  {isId
                    ? "Kesiapan sinkronisasi aktivitas & jam pintar"
                    : "Activity & wearable sync readiness"}
                </li>
              </ul>
              <Link
                href="/app"
                className="block text-center mt-4 py-4 rounded-xl bg-[#9EF01A] text-black font-bold text-sm hover:brightness-105 transition"
              >
                {isId ? "Buka Aplikasi & Kelola Paket" : "Open App & Manage Plan"}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-10 pb-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <FitMateLogo />
          <Link
            href="/app"
            className="text-[#9EF01A] font-semibold hover:underline"
          >
            {isId ? "Masuk ke Aplikasi (/app) →" : "Go to App (/app) →"}
          </Link>
        </footer>
      </div>
    </div>
  );
}