interface PageHeaderProps {
  userEmail: string;
  score: number | null;
  scoreColor: string;
  comparing: boolean;
  generating: boolean;
  canCheck: boolean;
  onCheck: () => void;
  onNewTask: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export function PageHeader({
  userEmail,
  score,
  scoreColor,
  comparing,
  generating,
  canCheck,
  onCheck,
  onNewTask,
  onOpenProfile,
  onLogout,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#111317]/95 backdrop-blur px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-500/70" />
          <div className="w-2 h-2 rounded-full bg-slate-400/70" />
          <div className="w-2 h-2 rounded-full bg-slate-300/70" />
        </div>
        <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-white/55">Layout Trainer</span>
      </div>
      <div className="flex items-center gap-2">
        {score !== null && <span className={`text-sm font-bold mr-1 tabular-nums ${scoreColor}`}>{score}%</span>}
        <button
          onClick={onCheck}
          disabled={!canCheck || comparing}
          className="text-[11px] px-4 py-1.5 rounded-lg bg-slate-200 text-slate-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-semibold tracking-wide"
        >
          {comparing ? "Checking…" : "Check"}
        </button>
        <button
          onClick={onNewTask}
          disabled={generating}
          className="text-[11px] px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/15 transition-all font-semibold"
        >
          {generating ? "Generating..." : "↻ New"}
        </button>
        <button
          onClick={onOpenProfile}
          className="text-[11px] px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/15 transition-all font-semibold"
          title={userEmail}
        >
          Profile
        </button>
        <button
          onClick={onLogout}
          className="text-[11px] px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/15 transition-all font-semibold"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
