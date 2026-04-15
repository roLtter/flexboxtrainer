interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const cls =
    score >= 90
      ? "border-slate-300/20 bg-slate-200/[0.08] text-slate-100"
      : score >= 60
        ? "border-slate-400/20 bg-slate-300/[0.06] text-slate-200"
        : "border-slate-500/20 bg-slate-500/[0.08] text-slate-300";

  const msg =
    score === 100
      ? "Perfect — all properties match."
      : score >= 90
        ? "Almost perfect — one or two properties differ."
        : score >= 70
          ? "Good — check gap, padding, or colors."
          : score >= 50
            ? "Structure matches; details differ."
            : "Compare sizes and colors with the inspector.";

  return (
    <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${cls}`}>
      <span className="text-2xl font-bold tabular-nums">{score}%</span>
      <span className="text-[11px] opacity-60 leading-relaxed">{msg}</span>
    </div>
  );
}
