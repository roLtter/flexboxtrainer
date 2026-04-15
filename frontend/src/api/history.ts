import type { TaskConfig } from "../utils/types";

export interface HistoryItem {
  task_id: number;
  best_score: number;
  last_code: string;
  last_editor_mode: "html" | "tsx";
  last_attempt_at: string;
  task_config: TaskConfig;
}

export interface UserStats {
  attempted_tasks_count: number;
  solved_95_count: number;
  flawless_count: number;
  unfinished_count: number;
  total_checks: number;
  avg_best_score: number;
  avg_check_score: number;
  solved_95_percent: number;
  flawless_percent: number;
  unfinished_percent: number;
  checks_per_task: number;
  acceptance_percent: number;
  flawless_rate_of_solved: number;
  unfinished_bucket_count: number;
  in_progress_bucket_count: number;
  solved_bucket_count: number;
}

export interface DailyStatsItem {
  day: string;
  unfinished: number;
  in_progress: number;
  solved: number;
  flawless: number;
}

export async function fetchUserHistory(userId: number): Promise<HistoryItem[]> {
  const response = await fetch(`/api/users/${userId}/history`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to load history");
  }
  const data = (await response.json()) as { items: Record<string, unknown>[] };
  return data.items.map((row) => ({
    task_id: Number(row.task_id),
    best_score: Number(row.best_score),
    last_code: String(row.last_code ?? ""),
    last_editor_mode: row.last_editor_mode === "tsx" ? "tsx" : "html",
    last_attempt_at: String(row.last_attempt_at ?? ""),
    task_config: row.task_config as TaskConfig,
  }));
}

export type ActivityRange = "week" | "month" | "year";

export interface HeatmapDay {
  day: string;
  count: number;
}

export async function fetchUserStats(
  userId: number,
  activity: ActivityRange = "week",
): Promise<{ stats: UserStats; daily: DailyStatsItem[]; heatmap: HeatmapDay[] }> {
  const params = new URLSearchParams({ activity });
  const response = await fetch(`/api/users/${userId}/stats?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to load stats");
  }
  const data = (await response.json()) as {
    stats: Record<string, number | string>;
    daily: DailyStatsItem[];
    heatmap?: { day: string; count: number }[];
  };
  const s = data.stats;
  const heatmap = (data.heatmap ?? []).map((h) => ({
    day: h.day,
    count: Number(h.count ?? 0),
  }));
  return {
    daily: data.daily,
    heatmap,
    stats: {
    attempted_tasks_count: Number(s.attempted_tasks_count ?? 0),
    solved_95_count: Number(s.solved_95_count ?? 0),
    flawless_count: Number(s.flawless_count ?? 0),
    unfinished_count: Number(s.unfinished_count ?? 0),
    total_checks: Number(s.total_checks ?? 0),
    avg_best_score: Number(s.avg_best_score ?? 0),
    avg_check_score: Number(s.avg_check_score ?? 0),
    solved_95_percent: Number(s.solved_95_percent ?? 0),
    flawless_percent: Number(s.flawless_percent ?? 0),
    unfinished_percent: Number(s.unfinished_percent ?? 0),
    checks_per_task: Number(s.checks_per_task ?? 0),
    acceptance_percent: Number(s.acceptance_percent ?? 0),
    flawless_rate_of_solved: Number(s.flawless_rate_of_solved ?? 0),
    unfinished_bucket_count: Number(s.unfinished_bucket_count ?? 0),
    in_progress_bucket_count: Number(s.in_progress_bucket_count ?? 0),
    solved_bucket_count: Number(s.solved_bucket_count ?? 0),
    },
  };
}

