import type { TaskConfig } from "../utils/types";

interface GenerateTaskResponse {
  task: TaskConfig;
}

export interface GeneratedTask {
  task: TaskConfig;
}

export async function requestGeneratedTask(maxContainerWidth: number, maxContainerHeight: number): Promise<GeneratedTask> {
  const response = await fetch("/api/tasks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ maxContainerWidth, maxContainerHeight }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate task: ${response.status}`);
  }

  const data = (await response.json()) as GenerateTaskResponse;
  return { task: data.task };
}

export async function submitTaskAttempt(
  taskId: number | null,
  score: number,
  code: string,
  mode: "html" | "tsx",
  task?: TaskConfig,
): Promise<number> {
  const endpoint = taskId === null ? "/api/tasks/attempts" : `/api/tasks/${taskId}/attempts`;
  const payload =
    taskId === null ? { score, code, mode, task } : { score, code, mode };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to submit attempt: ${response.status}`);
  }
  if (taskId !== null) return taskId;
  const data = (await response.json()) as { taskId: number };
  return Number(data.taskId);
}

export async function fetchTaskById(taskId: number): Promise<TaskConfig> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to load task: ${response.status}`);
  }
  const data = (await response.json()) as { task: TaskConfig };
  return data.task;
}
