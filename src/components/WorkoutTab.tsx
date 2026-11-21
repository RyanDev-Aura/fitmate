"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Lang } from "@/lib/i18n";

type WorkoutPlan = {
  id: string;
  title_en: string;
  title_id: string;
  planner_mode: string;
  estimated_minutes: number;
};

type ExerciseItem = {
  id: string;
  name_en: string;
  name_id: string;
  muscle_group: string;
  default_sets: number;
  default_reps: number;
  default_rest_sec: number;
};

type WorkoutTabProps = {
  lang: Lang;
};

export default function WorkoutTab({ lang }: WorkoutTabProps) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);

  // State Rest Timer
  const [restDuration, setRestDuration] = useState(45);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [isRunning, setIsRunning] = useState(false);

  // State Hybrid AI Generator
  const [goal, setGoal] = useState<"build_muscle" | "lose_fat" | "get_stronger">("build_muscle");
  const [minutes, setMinutes] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const isId = lang === "id";

  async function loadWorkoutData() {
    const { data: planRows } = await supabase
      .from("workout_plans")
      .select("id, title_en, title_id, planner_mode, estimated_minutes")
      .order("created_at", { ascending: false });

    if (planRows && planRows.length > 0) {
      setPlans(planRows);
      setSelectedPlanId((prev) => prev ?? planRows[0].id);
    }

    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, name_en, name_id, muscle_group, default_sets, default_reps, default_rest_sec");

    if (exRows) {
      setExercises(exRows);
    }
  }

  useEffect(() => {
    loadWorkoutData();
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return restDuration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, restDuration]);

  async function handleGenerateHybridPlan() {
    setIsGenerating(true);
    setStatusMsg("");

    const titleMap = {
      build_muscle: {
        id: `Hybrid Hipertrofi (${minutes}m)`,
        en: `Hybrid Hypertrophy (${minutes}m)`,
      },
      lose_fat: {
        id: `Hybrid Fat Burn (${minutes}m)`,
        en: `Hybrid Fat Burn (${minutes}m)`,
      },
      get_stronger: {
        id: `Hybrid Strength (${minutes}m)`,
        en: `Hybrid Strength (${minutes}m)`,
      },
    };

    const { data: newPlan, error } = await supabase
      .from("workout_plans")
      .insert({
        title_id: titleMap[goal].id,
        title_en: titleMap[goal].en,
        planner_mode: "hybrid",
        estimated_minutes: minutes,
      })
      .select()
      .single();

    if (!error && newPlan && exercises.length > 0) {
      const itemsToInsert = exercises.slice(0, 3).map((ex, idx) => ({
        plan_id: newPlan.id,
        exercise_id: ex.id,
        sort_order: idx + 1,
        target_sets: goal === "get_stronger" ? 4 : ex.default_sets,
        target_reps: goal === "get_stronger" ? 6 : goal === "lose_fat" ? 15 : ex.default_reps,
        target_weight_kg: 30,
        rest_seconds: ex.default_rest_sec,
      }));

      await supabase.from("workout_plan_items").insert(itemsToInsert);
      await loadWorkoutData();
      setSelectedPlanId(newPlan.id);
      setStatusMsg(isId ? "Rencana hybrid AI berhasil dibuat!" : "AI hybrid plan created!");
    }

    setIsGenerating(false);
  }

  async function handleSaveProgress() {
    if (!selectedPlanId) return;
    await supabase
      .from("workout_plans")
      .update({ is_completed_this_week: true })
      .eq("id", selectedPlanId);

    setStatusMsg(isId ? "Progres latihan tersimpan ke Supabase!" : "Workout progress saved to Supabase!");
  }

  const activeExercise = exercises[activeExerciseIdx];
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Hybrid Workout Planner</h2>
        <p className="text-xs text-neutral-400 mt-1">
          {isId
            ? "Gabungkan template latihan bawaan dengan rencana AI sesuai tujuan & waktu Anda."
            : "Combine workout templates with AI plans tailored to your goal & time."}
        </p>
      </div>

      {/* Hybrid AI Generator */}
      <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-3">
        <span className="text-xs font-bold text-[#9EF01A] uppercase block">
          {isId ? "Buat Rencana Hybrid (Template + AI)" : "Create Hybrid Plan (Template + AI)"}
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              {isId ? "Tujuan Utama" : "Fitness Goal"}
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="build_muscle">{isId ? "Massa Otot" : "Build Muscle"}</option>
              <option value="lose_fat">{isId ? "Turun Lemak" : "Lose Fat"}</option>
              <option value="get_stronger">{isId ? "Kekuatan" : "Get Stronger"}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              {isId ? "Durasi (Menit)" : "Duration (Min)"}
            </label>
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full bg-[#0B0D0C] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value={30}>30 {isId ? "mnt" : "min"}</option>
              <option value={45}>45 {isId ? "mnt" : "min"}</option>
              <option value={60}>60 {isId ? "mnt" : "min"}</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateHybridPlan}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-xl bg-[#9EF01A] text-black font-bold text-xs hover:brightness-105 transition cursor-pointer disabled:opacity-50"
        >
          {isGenerating
            ? isId
              ? "Menyusun Rencana..."
              : "Generating Plan..."
            : isId
            ? "+ Generate Rencana Hybrid AI"
            : "+ Generate AI Hybrid Plan"}
        </button>

        {statusMsg && <p className="text-xs text-[#9EF01A] font-medium">{statusMsg}</p>}
      </div>

      {/* Pilihan Rencana Latihan */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {plans.map((p) => {
          const active = p.id === selectedPlanId;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlanId(p.id);
                setCompletedSets(0);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                active
                  ? "bg-[#9EF01A] text-black border-[#9EF01A]"
                  : "bg-[#161A18] text-neutral-300 border-white/10"
              }`}
            >
              {isId ? p.title_id : p.title_en} • {p.estimated_minutes}m
            </button>
          );
        })}
      </div>

      {/* Latihan Aktif & Rest Timer */}
      {activeExercise && (
        <div className="bg-[#161A18] border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#9EF01A] font-semibold">
                {isId ? "LATIHAN AKTIF" : "ACTIVE EXERCISE"} ({activeExerciseIdx + 1}/{exercises.length})
              </span>
              <h3 className="text-lg font-bold mt-0.5">
                {isId ? activeExercise.name_id : activeExercise.name_en}
              </h3>
              <p className="text-xs text-neutral-400">
                {activeExercise.muscle_group} • {activeExercise.default_sets} {isId ? "set" : "sets"} ×{" "}
                {activeExercise.default_reps} {isId ? "repetisi" : "reps"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] text-neutral-400">{isId ? "Set Selesai" : "Sets Done"}</p>
              <p className="text-xl font-extrabold text-[#9EF01A]">{completedSets}</p>
            </div>
          </div>

          <div className="bg-[#0B0D0C] border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
              {isId ? "Rest Timer (Istirahat)" : "Rest Timer"}
            </p>
            <p className="text-4xl font-black tracking-widest text-white">
              {mins}:{secs}
            </p>

            <div className="flex justify-center gap-2 mt-3">
              {[30, 45, 60, 90].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setIsRunning(false);
                    setRestDuration(sec);
                    setSecondsLeft(sec);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    restDuration === sec
                      ? "bg-[#9EF01A]/20 text-[#9EF01A] border border-[#9EF01A]/50"
                      : "bg-[#161A18] text-neutral-400"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => setIsRunning((r) => !r)}
                className="py-2 rounded-xl bg-[#9EF01A] text-black font-bold text-xs cursor-pointer"
              >
                {isRunning
                  ? isId
                    ? "Jeda"
                    : "Pause"
                  : isId
                  ? "Mulai"
                  : "Start"}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(restDuration);
                }}
                className="py-2 rounded-xl bg-[#161A18] border border-white/10 text-xs font-semibold cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setCompletedSets((s) => s + 1);
                  setSecondsLeft(restDuration);
                  setIsRunning(true);
                }}
                className="py-2 rounded-xl bg-white/10 text-white text-xs font-semibold cursor-pointer"
              >
                +1 Set & Rest
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveExerciseIdx((idx) => (idx + 1) % Math.max(exercises.length, 1))
              }
              className="flex-1 py-2.5 rounded-xl bg-[#0B0D0C] border border-white/15 text-xs font-semibold cursor-pointer"
            >
              {isId ? "Gerakan Berikutnya →" : "Next Exercise →"}
            </button>
            <button
              onClick={handleSaveProgress}
              className="flex-1 py-2.5 rounded-xl bg-[#9EF01A] text-black text-xs font-bold cursor-pointer"
            >
              {isId ? "Simpan Progres" : "Save Progress"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}