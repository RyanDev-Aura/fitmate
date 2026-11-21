"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/lib/i18n";
import {
  getDefaultSubscription,
  getTodayAiUsageCount,
  incrementTodayAiUsageCount,
  loadSubscriptionState,
  SubscriptionState,
} from "@/lib/subscription";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiCoachTabProps = {
  lang: Lang;
  subscription?: SubscriptionState;
  onOpenProfile?: () => void;
  context?: {
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
};

const QUICK_PROMPTS_ID = [
  "Rekomendasi menu makan siang tinggi protein & praktis",
  "Bagaimana cara atur minum air biar tidak begah?",
  "Buatkan jadwal olahraga pemula lari + beban",
  "Minum kopi malam hari sebelum tidur cocok tidak untuk diet BB?",
];

const QUICK_PROMPTS_EN = [
  "High-protein practical lunch meal ideas",
  "How to drink enough water without feeling bloated?",
  "Simple beginner running + strength schedule",
  "Is having coffee at night before sleep good for weight loss?",
];

export default function AiCoachTab({
  lang,
  subscription,
  onOpenProfile,
  context,
}: AiCoachTabProps) {
  const isId = lang === "id";
  const [activeSub, setActiveSub] = useState<SubscriptionState>(
    () => subscription ?? getDefaultSubscription()
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: isId
        ? "Halo! Saya FitMate AI Coach. Silakan tanyakan kendala atau kebutuhan Anda seputar porsi makan, target kalori & makro, minum air, atau rencana latihan."
        : "Hi! I'm FitMate AI Coach. Ask me anything about meal portions, calorie & macro targets, hydration, or workout plans.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedCount, setUsedCount] = useState<number>(0);

  useEffect(() => {
    const loadedSub = subscription ?? loadSubscriptionState();
    setActiveSub(loadedSub);
    setUsedCount(getTodayAiUsageCount());
  }, [subscription]);

  const isPro = activeSub.tier === "pro";
  const dailyLimit = activeSub.dailyAiLimitTrial || 5;
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const effectiveUsed = Math.max(usedCount, userMessageCount);
  const remainingChats = Math.max(0, dailyLimit - effectiveUsed);
  const isQuotaReached = !isPro && remainingChats <= 0;

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const currentSub = subscription ?? loadSubscriptionState();
    setActiveSub(currentSub);

    const currentUsed = Math.max(
      getTodayAiUsageCount(),
      messages.filter((m) => m.role === "user").length
    );

    if (currentSub.tier !== "pro" && currentUsed >= (currentSub.dailyAiLimitTrial || 5)) {
      setUsedCount(currentUsed);
      return;
    }

    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (currentSub.tier !== "pro") {
      const nextUsed = Math.max(incrementTodayAiUsageCount(), currentUsed + 1);
      setUsedCount(nextUsed);
    }

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: {
            lang,
            ...context,
          },
        }),
      });

      const data = await res.json();
      const replyText =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : isId
          ? "Maaf, saya belum bisa memproses pesan saat ini. Coba lagi beberapa saat."
          : "Sorry, I couldn't process that right now. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: replyText,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          content: isId
            ? "Terjadi gangguan koneksi saat menghubungi AI Coach."
            : "Network error while contacting AI Coach.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "assistant",
        content: isId
          ? "Riwayat chat direset. Ada yang ingin Anda tanyakan hari ini?"
          : "Chat history reset. What would you like to ask today?",
      },
    ]);
  }

  const quickPrompts = isId ? QUICK_PROMPTS_ID : QUICK_PROMPTS_EN;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">
            {isId ? "Pelatih AI" : "AI Coach"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isId
              ? "Asisten nutrisi & latihan berbasis target personal Anda."
              : "Nutrition & workout assistant tailored to your personal targets."}
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161A18] border border-white/15 text-neutral-300 hover:border-white/30 transition cursor-pointer"
        >
          {isId ? "Reset Chat" : "Reset Chat"}
        </button>
      </div>

      {/* Ringkasan Target & Kuota Uji Coba / PRO */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between text-xs gap-2">
        <div>
          <span className="text-neutral-400">
            {isId ? "Target Aktif:" : "Active Target:"}{" "}
          </span>
          <span className="font-bold text-[#9EF01A]">
            {(context?.calorieTarget ?? 2500).toLocaleString()} kcal
          </span>
        </div>

        <div className="text-right">
          {isPro ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9EF01A] text-black">
              PRO • Unlimited
            </span>
          ) : (
            <span className="text-neutral-300 font-semibold">
              {isId ? "Sisa Uji Coba:" : "Trial Left:"}{" "}
              <span className="text-[#9EF01A]">
                {remainingChats}/{dailyLimit}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Pilihan Pertanyaan Cepat */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {quickPrompts.map((promptText) => (
          <button
            key={promptText}
            type="button"
            disabled={isQuotaReached}
            onClick={() => sendMessage(promptText)}
            className="shrink-0 px-3 py-2 rounded-xl text-xs bg-[#161A18] border border-white/10 text-neutral-200 hover:border-[#9EF01A]/50 disabled:opacity-50 transition cursor-pointer"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Daftar Pesan */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3 min-h-[220px] max-h-[380px] overflow-y-auto no-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                  isUser
                    ? "bg-[#9EF01A] text-black font-semibold"
                    : "bg-[#0B0D0C] border border-white/10 text-neutral-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="text-xs text-neutral-400">
            {isId ? "Pelatih AI sedang mengetik..." : "AI Coach is typing..."}
          </div>
        )}
      </div>

      {/* Banner Kuota Uji Coba Habis */}
      {isQuotaReached && (
        <div className="bg-[#161A18] border border-[#9EF01A]/40 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-[#9EF01A]">
            {isId
              ? "Kuota Chat Uji Coba Hari Ini Sudah Habis"
              : "Daily Trial Chat Quota Reached"}
          </p>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            {isId
              ? `Mode Uji Coba menyediakan ${dailyLimit} pesan Pelatih AI per hari. Aktifkan mode PRO di tab Profil untuk chat tanpa batas.`
              : `Trial mode includes ${dailyLimit} AI Coach messages per day. Enable PRO mode in the Profile tab for unlimited chats.`}
          </p>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-1 px-4 py-2 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 transition cursor-pointer"
            >
              {isId ? "Buka Profil & Aktifkan PRO" : "Open Profile & Enable PRO"}
            </button>
          )}
        </div>
      )}

      {/* Input Pesan */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          disabled={loading || isQuotaReached}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isQuotaReached
              ? isId
                ? "Kuota Uji Coba habis — aktifkan PRO di Profil"
                : "Trial quota reached — enable PRO in Profile"
              : isId
              ? "Tanya menu, porsi, kalori, atau latihan..."
              : "Ask about meals, portions, calories, or workouts..."
          }
          className="flex-1 bg-[#161A18] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || isQuotaReached || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 disabled:opacity-50 transition cursor-pointer"
        >
          {isId ? "Kirim" : "Send"}
        </button>
      </form>
    </div>
  );
}