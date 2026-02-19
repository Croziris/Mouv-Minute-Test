export interface SessionHistoryItem {
  id: string;
  created_at: string;
  duration_minutes: number;
  completed: boolean;
}

const SESSIONS_KEY = "mouv-minute-sessions";

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getSessionHistory = (): SessionHistoryItem[] => {
  if (typeof window === "undefined") return [];
  return safeParse<SessionHistoryItem[]>(localStorage.getItem(SESSIONS_KEY), []);
};

export const addSessionHistoryItem = (item: Omit<SessionHistoryItem, "id" | "created_at">) => {
  if (typeof window === "undefined") return;
  const sessions = getSessionHistory();
  sessions.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...item,
  });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};
