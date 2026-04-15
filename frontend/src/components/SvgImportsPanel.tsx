import type { TaskConfig } from "../utils/types";
import { getSvgRaw } from "../utils/svgIcons";
import type { SvgIconName } from "../utils/svgIcons";

interface SvgImportsPanelProps {
  task: TaskConfig;
}

export function SvgImportsPanel({ task }: SvgImportsPanelProps) {
  if (task.svgNames.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-[#171a1f] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 mb-2.5 font-semibold">
        Elements to import:
      </div>

      <div className="flex flex-wrap gap-2">
        {task.svgNames.map((name) => {
          const box = task.boxes.find((b) => b.svg?.name === name);
          const svg = box?.svg;
          const raw = svg
            ? getSvgRaw(name as SvgIconName, svg.color)
            : getSvgRaw(name as SvgIconName, "#fff");

          return (
            <div
              key={name}
              className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2"
            >
              <div className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: raw }} />
              <code className="text-[11px] font-mono text-slate-200">
                {name}.svg
              </code>
              {svg && (
                <span className="text-[10px] text-white/20 font-mono">
                  {svg.size}×{svg.size} · {svg.color.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-white/40">
        Use{" "}
        <code className="font-mono text-slate-300/70">
          {"<img src=\"Name.svg\" width=\"N\" height=\"N\" />"}
        </code>{" "}
        inside the matching box; flex centers the icon.
      </p>
    </div>
  );
}
