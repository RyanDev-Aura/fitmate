export type PlanTier = "trial" | "pro";

export type SubscriptionState = {
  tier: PlanTier;
  trialStartedAt: string; // ISO date string
  trialDays: number;
  dailyAiLimitTrial: number;
};

type AiUsageRecord = {
  dateKey: string;
  count: number;
};

const SUBSCRIPTION_STORAGE_KEY = "fitmate_subscription_v1";
const AI_USAGE_STORAGE_KEY = "fitmate_ai_usage_v1";

export function getLocalDateKey(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultSubscription(): SubscriptionState {
  return {
    tier: "trial",
    trialStartedAt: new Date().toISOString(),
    trialDays: 7,
    dailyAiLimitTrial: 5,
  };
}

export function loadSubscriptionState(): SubscriptionState {
  const fallback = getDefaultSubscription();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<SubscriptionState>;
    return {
      tier: parsed.tier === "pro" ? "pro" : "trial",
      trialStartedAt:
        typeof parsed.trialStartedAt === "string" && parsed.trialStartedAt
          ? parsed.trialStartedAt
          : fallback.trialStartedAt,
      trialDays:
        typeof parsed.trialDays === "number" && parsed.trialDays > 0
          ? parsed.trialDays
          : fallback.trialDays,
      dailyAiLimitTrial:
        typeof parsed.dailyAiLimitTrial === "number" && parsed.dailyAiLimitTrial > 0
          ? parsed.dailyAiLimitTrial
          : fallback.dailyAiLimitTrial,
    };
  } catch {
    return fallback;
  }
}

export function saveSubscriptionState(next: SubscriptionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

export function getTrialDaysLeft(sub: SubscriptionState): number {
  const started = new Date(sub.trialStartedAt).getTime();
  if (Number.isNaN(started)) return sub.trialDays;
  const elapsedDays = Math.floor((Date.now() - started) / (1000 * 60 * 60 * 24));
  return Math.max(0, sub.trialDays - elapsedDays);
}

export function getTodayAiUsageCount(): number {
  if (typeof window === "undefined") return 0;
  const todayKey = getLocalDateKey();
  try {
    const raw = window.localStorage.getItem(AI_USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<AiUsageRecord>;
    if (parsed.dateKey !== todayKey) return 0;
    return typeof parsed.count === "number" && parsed.count >= 0 ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export function incrementTodayAiUsageCount(): number {
  const nextCount = getTodayAiUsageCount() + 1;
  if (typeof window === "undefined") return nextCount;
  const record: AiUsageRecord = {
    dateKey: getLocalDateKey(),
    count: nextCount,
  };
  try {
    window.localStorage.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Abaikan jika storage tidak tersedia
  }
  return nextCount;
}

export function resetTodayAiUsageCount(): void {
  if (typeof window === "undefined") return;
  const record: AiUsageRecord = {
    dateKey: getLocalDateKey(),
    count: 0,
  };
  try {
    window.localStorage.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}