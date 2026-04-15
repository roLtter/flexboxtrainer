import { TargetRenderer } from "../../../components/TargetRenderer";
import { Tooltip } from "../../../components/Tooltip";
import type { InspectedItem, TaskConfig } from "../../../utils/types";
import type { RefCallback, RefObject } from "react";

interface TargetPreviewRowProps {
  task: TaskConfig | null;
  generating: boolean;
  selected: InspectedItem | null;
  panelHeight: number;
  panelRef: RefObject<HTMLDivElement | null>;
  containerRef: RefCallback<HTMLDivElement>;
  previewIframeRef: RefObject<HTMLIFrameElement | null>;
  onSelect: (item: InspectedItem | null) => void;
}

export function TargetPreviewRow({
  task,
  generating,
  selected,
  panelHeight,
  panelRef,
  containerRef,
  previewIframeRef,
  onSelect,
}: TargetPreviewRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div ref={panelRef}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold">Target</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-[10px] text-white/35">click to inspect</span>
        </div>
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/[0.1] bg-[#171a1f] shadow-[0_6px_30px_rgba(0,0,0,0.35)]"
          style={{ height: panelHeight }}
          onClick={() => onSelect(null)}
        >
          {task ? (
            <TargetRenderer task={task} selected={selected} onSelect={onSelect} containerRef={containerRef} />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="spinner" />
              <div className="text-white/60 text-sm">{generating ? "Generating task..." : "Loading task..."}</div>
              <div className="w-44 h-4 rounded skeleton" />
            </div>
          )}
          {selected && <Tooltip item={selected} onClose={() => onSelect(null)} />}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold">Preview</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/[0.1] bg-[#171a1f] shadow-[0_6px_30px_rgba(0,0,0,0.35)]" style={{ height: panelHeight }}>
          <iframe
            ref={previewIframeRef}
            className="h-full w-full border-0"
            title="preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
