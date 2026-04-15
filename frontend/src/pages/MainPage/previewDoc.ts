import type { TaskConfig } from "../../utils/types";
import { buildSvgColorMap } from "../../utils/htmlBuilder";
import { buildSvgInjectionScript } from "../../utils/svgIcons";
import type { SvgIconName } from "../../utils/svgIcons";
import type { EditorMode } from "./types";

export const TAILWIND_CDN = "https://cdn.tailwindcss.com";

const PREVIEW_STYLE =
  "*{margin:0;padding:0;box-sizing:border-box;}body{background:#171a1f;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}";

export function buildPreviewDoc(code: string, mode: EditorMode, task: TaskConfig): string {
  const inner =
    mode === "tsx"
      ? code.replace(/className=/g, "class=").replace(/<>/g, "<div>").replace(/<\/>/g, "</div>")
      : code;

  const colorMap = buildSvgColorMap(task);
  const svgScript = buildSvgInjectionScript(task.svgNames as SvgIconName[], colorMap);

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="${TAILWIND_CDN}"><\/script>
<style>${PREVIEW_STYLE}</style>${svgScript}
</head><body>${inner}</body></html>`;
}
