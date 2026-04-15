import type { TaskConfig } from "../../utils/types";

export type EditorMode = "html" | "tsx";

export interface SavedState {
  taskId: number | null;
  task: TaskConfig;
  code: string;
  mode: EditorMode;
}
