import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchTaskById } from "../api/task";
import {
  fetchUserHistory,
  fetchUserStats,
  type ActivityRange,
  type DailyStatsItem,
  type HeatmapDay,
  type HistoryItem,
  type UserStats,
} from "../api/history";
import { updateProfile, type AuthUser, type ProfileUpdate } from "../api/auth";
import type { TaskConfig } from "../utils/types";
import type { EditorMode } from "./MainPage/types";

interface ProfilePageProps {
  user: AuthUser;
  onBackToTasks: () => void;
  onLogout: () => void;
  onOpenHistoryTask: (payload: { taskId: number; task: TaskConfig; code: string; mode: EditorMode }) => void;
  onProfileUpdated: (user: AuthUser) => void;
  onError: (message: string) => void;
}

type Tab = "history" | "stats";
type BadgeKind = "unfinished" | "in_progress" | "solved" | "flawless";

const CHART_UNFINISHED = "#dc2626";
const CHART_IN_PROGRESS = "#ea580c";
const CHART_SOLVED = "#10b981";
const CHART_FLAWLESS = "#e6bce5";

const AVATAR_GRADIENTS: [string, string][] = [
  ["#4f46e5", "#7c3aed"],
  ["#be185d", "#ea580c"],
  ["#0d9488", "#2563eb"],
  ["#b45309", "#ca8a04"],
  ["#4338ca", "#6366f1"],
  ["#0e7490", "#14b8a6"],
  ["#9d174d", "#c026d3"],
  ["#166534", "#22c55e"],
  ["#1e3a8a", "#3b82f6"],
  ["#7f1d1d", "#dc2626"],
  ["#4c1d95", "#a855f7"],
  ["#134e4a", "#2dd4bf"],
  ["#831843", "#e11d48"],
  ["#713f12", "#eab308"],
  ["#312e81", "#818cf8"],
  ["#115e59", "#5eead4"],
  ["#166534", "#84cc16"],
  ["#15803d", "#4ade80"],
  ["#854d0e", "#facc15"],
  ["#a16207", "#fde047"],
  ["#b91c1c", "#f87171"],
  ["#be123c", "#fb7185"],
];

const WORKPLACE_PRESETS = ["Student", "Freelance", "IT / engineering", "Design", "Side project", "Other"] as const;

const COUNTRY_FALLBACK_CODES = [
  "AF","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ",
  "BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL",
  "CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV",
  "GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD",
  "GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT",
  "JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG",
  "MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR",
  "NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN",
  "PL","PT","PR","QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC",
  "SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH",
  "TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","UM","US","UY","UZ","VU","VE","VN","VG",
  "VI","WF","EH","YE","ZM","ZW","AX",
] as const;

function getCountryOptions(): { code: string; name: string }[] {
  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames([navigator.language || "en"], { type: "region" });
  } catch {
    regionNames = null;
  }
  const codes = [...COUNTRY_FALLBACK_CODES];
  return codes
    .map((code) => ({ code, name: regionNames?.of(code) ?? code }))
    .filter((c) => /^[A-Z]{2}$/.test(c.code) && c.name.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const COUNTRIES = getCountryOptions();

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const u = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(u)) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + u.charCodeAt(0) - 65, A + u.charCodeAt(1) - 65);
}

function formatRelativeEn(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "1 day ago" : `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return w === 1 ? "1 week ago" : `${w} weeks ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo === 1 ? "1 month ago" : `${mo} months ago`;
  const y = Math.floor(d / 365);
  return y === 1 ? "1 year ago" : `${y} years ago`;
}

function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function displayNameOf(user: AuthUser): string {
  const n = user.nickname?.trim();
  if (n) return n;
  const local = user.email.split("@")[0];
  return local || user.email;
}

function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const p = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (p.slice(0, 2) || "??").toUpperCase();
}

function scoreTone(score: number): string {
  if (score === 100) return "text-[#e6bce5]";
  if (score >= 95) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-red-400";
}

function scoreBadge(score: number): BadgeKind {
  if (score === 100) return "flawless";
  if (score >= 95) return "solved";
  if (score >= 50) return "in_progress";
  return "unfinished";
}

function badgeLabel(kind: BadgeKind): string {
  if (kind === "flawless") return "Flawless";
  if (kind === "solved") return "Solved";
  if (kind === "in_progress") return "In Progress";
  return "Unfinished";
}

function badgeClass(kind: BadgeKind, active = false): string {
  const base =
    kind === "flawless"
      ? "bg-[#e6bce5]/15 border-[#e6bce5]/45 text-[#f5e3f3] shadow-[inset_0_1px_0_rgba(230,188,229,0.12)]"
      : kind === "solved"
        ? "bg-emerald-500/[0.14] border-emerald-400/30 text-emerald-100"
        : kind === "in_progress"
          ? "bg-amber-500/[0.14] border-amber-400/30 text-amber-100"
          : "bg-red-600/[0.18] border-red-500/35 text-red-100";
  return `${base} ${active ? "ring-1 ring-white/35" : ""}`;
}

function DonutChart({ stats }: { stats: UserStats }) {
  const values = [
    { key: "unfinished", value: stats.unfinished_bucket_count, color: CHART_UNFINISHED },
    { key: "in_progress", value: stats.in_progress_bucket_count, color: CHART_IN_PROGRESS },
    { key: "solved", value: stats.solved_bucket_count, color: CHART_SOLVED },
    { key: "flawless", value: stats.flawless_count, color: CHART_FLAWLESS },
  ];
  const rawTotal = values.reduce((s, v) => s + v.value, 0);
  const total = Math.max(1, rawTotal);
  let acc = 0;
  const segments =
    rawTotal <= 0
      ? ["rgba(148,163,184,0.28) 0% 100%"]
      : values.map((v) => {
          const start = (acc / total) * 100;
          acc += v.value;
          const end = (acc / total) * 100;
          return `${v.color} ${start}% ${end}%`;
        });
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="relative mx-auto sm:mx-0 h-40 w-40 shrink-0">
        <div
          className="absolute inset-0 rounded-full ring-1 ring-white/[0.08] stats-donut-in"
          style={{ background: `conic-gradient(${segments.join(",")})` }}
        />
        <div className="absolute inset-[26%] rounded-full bg-[#141619] ring-1 ring-white/[0.06]" />
      </div>
      <div className="flex-1 space-y-2.5 text-[13px]">
        {values.map((v) => (
          <div key={v.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/15"
                style={{ background: v.color }}
              />
              <span className="text-white/60 truncate">{badgeLabel(v.key as BadgeKind)}</span>
            </div>
            <span className="tabular-nums text-white font-semibold">{v.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function activityAxisLabel(day: string, range: ActivityRange): string {
  if (range === "year") {
    const [y, m] = day.split("-");
    const month = Number(m);
    const short =
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? m;
    return `${short} '${String(y).slice(2)}`;
  }
  return day.slice(5);
}

type HeatCell = { day: string; count: number };

function buildHeatmapColumns(rows: HeatmapDay[]): HeatCell[][] {
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const dataStart = new Date(end.getFullYear(), 0, 1);
  dataStart.setHours(0, 0, 0, 0);

  function isoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDays(d: Date, n: number): Date {
    const o = new Date(d);
    o.setDate(o.getDate() + n);
    return o;
  }

  const columns: HeatCell[][] = [];
  let day = new Date(dataStart);
  while (day <= end) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7 && day <= end; i++) {
      const d = new Date(day);
      const key = isoLocal(d);
      const count = map.get(key) ?? 0;
      col.push({ day: key, count });
      day = addDays(day, 1);
    }
    columns.push(col);
  }
  return columns;
}

function heatLevel(count: number, max: number): number {
  if (!count || max <= 0) return 0;
  const r = count / max;
  if (r <= 0.12) return 1;
  if (r <= 0.3) return 2;
  if (r <= 0.6) return 3;
  return 4;
}

const HEAT_LEVEL_STYLE: Record<number, { background: string; borderColor: string; boxShadow?: string }> = {
  0: { background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)" },
  1: {
    background: "linear-gradient(135deg, rgba(147,197,253,0.58), rgba(96,165,250,0.52))",
    borderColor: "rgba(125,211,252,0.52)",
  },
  2: {
    background: "linear-gradient(135deg, rgba(96,165,250,0.72), rgba(59,130,246,0.66))",
    borderColor: "rgba(96,165,250,0.66)",
    boxShadow: "0 0 0 1px rgba(125,211,252,0.22) inset",
  },
  3: {
    background: "linear-gradient(135deg, rgba(56,189,248,0.84), rgba(37,99,235,0.8))",
    borderColor: "rgba(56,189,248,0.72)",
    boxShadow: "0 0 0 1px rgba(125,211,252,0.32) inset",
  },
  4: {
    background: "linear-gradient(135deg, rgba(14,165,233,0.96), rgba(30,64,175,0.92))",
    borderColor: "rgba(56,189,248,0.85)",
    boxShadow: "0 0 8px rgba(56,189,248,0.35)",
  },
};

function ActivityHeatmap({ rows }: { rows: HeatmapDay[] }) {
  const columns = useMemo(() => buildHeatmapColumns(rows), [rows]);
  const max = useMemo(() => Math.max(1, ...rows.map((r) => r.count)), [rows]);
  return (
    <div className="mt-8 border-t border-white/[0.08] pt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="text-[13px] font-medium text-white/75">Daily checks</div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((lv) => (
              <div key={lv} className="h-3.5 w-3.5 rounded-sm border" style={HEAT_LEVEL_STYLE[lv]} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-min gap-[3px]">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell) => {
                const lv = heatLevel(cell.count, max);
                return (
                  <div
                    key={cell.day}
                    title={`${cell.day}: ${cell.count} checks`}
                    className="h-2.5 w-2.5 shrink-0 rounded-sm border"
                    style={HEAT_LEVEL_STYLE[lv]}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityChart({
  daily,
  range,
  onRangeChange,
  loading,
}: {
  daily: DailyStatsItem[];
  range: ActivityRange;
  onRangeChange: (r: ActivityRange) => void;
  loading: boolean;
}) {
  const maxTotal = Math.max(1, ...daily.map((d) => d.unfinished + d.in_progress + d.solved + d.flawless));
  const rangeLabel = range === "week" ? "7 days" : range === "month" ? "30 days" : "12 months";
  return (
    <div className="relative flex min-h-56 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-white/70">Status mix · {rangeLabel}</div>
        <div className="inline-flex rounded-lg border border-white/[0.1] bg-black/25 p-0.5">
          {(["week", "month", "year"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                range === r ? "bg-white text-slate-900 shadow-sm" : "text-white/45 hover:text-white/75"
              }`}
            >
              {r === "week" ? "Week" : r === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </div>
      <div
        key={range}
        className={`flex min-h-44 flex-1 items-end gap-1 sm:gap-1.5 ${range === "month" ? "gap-0.5" : ""}`}
      >
        {daily.map((d, i) => {
          const total = d.unfinished + d.in_progress + d.solved + d.flawless;
          const colH = Math.max((total / maxTotal) * 100, total ? 10 : 4);
          return (
            <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex h-40 w-full items-end justify-center">
                {total === 0 ? (
                  <div className="h-1 w-full max-w-5 rounded-sm bg-white/[0.06]" />
                ) : (
                  <div
                    className="stats-bar-rise flex w-full max-w-[14px] sm:max-w-5 flex-col-reverse overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03] transition-[height] duration-500 ease-out"
                    style={{
                      height: `${colH}%`,
                      animationDelay: `${Math.min(i, 24) * 18}ms`,
                    }}
                  >
                    {d.unfinished > 0 && (
                      <div style={{ flex: d.unfinished, background: CHART_UNFINISHED, minHeight: 1 }} />
                    )}
                    {d.in_progress > 0 && (
                      <div style={{ flex: d.in_progress, background: CHART_IN_PROGRESS, minHeight: 1 }} />
                    )}
                    {d.solved > 0 && <div style={{ flex: d.solved, background: CHART_SOLVED, minHeight: 1 }} />}
                    {d.flawless > 0 && (
                      <div style={{ flex: d.flawless, background: CHART_FLAWLESS, minHeight: 1 }} />
                    )}
                  </div>
                )}
              </div>
              <span className="max-w-full truncate text-center text-[9px] leading-tight text-white/40 sm:text-[10px]">
                {activityAxisLabel(d.day, range)}
              </span>
            </div>
          );
        })}
      </div>
      {loading && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[#141619]/55 backdrop-blur-[2px] transition-opacity" />
      )}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

async function toAvatarDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpeg)$/i.test(file.type)) {
    throw new Error("Only PNG and JPG are supported");
  }
  const src = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image"));
    el.src = src;
  });
  const maxSide = 256;
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.9);
  if (out.length > 1_500_000) {
    throw new Error("Avatar is too large. Try a smaller image.");
  }
  return out;
}

function StatCard({
  title,
  value,
  hint,
  tone = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  tone?: "neutral" | "green" | "yellow" | "red" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/[0.08]"
      : tone === "yellow"
        ? "border-amber-400/20 bg-amber-400/[0.08]"
        : tone === "red"
          ? "border-rose-400/20 bg-rose-500/[0.08]"
          : tone === "violet"
            ? "border-violet-300/25 bg-violet-400/[0.09]"
            : "border-white/[0.07] bg-white/[0.025]";
  return (
    <div className={`rounded-2xl border px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${toneClass}`}>
      <div className="text-[11px] font-medium tracking-wide text-white/42">{title}</div>
      <div className="mt-1.5 text-[1.6rem] font-bold tracking-tight text-white tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-white/38">{hint}</div>
    </div>
  );
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function ThemePreview({ task }: { task: TaskConfig }) {
  return (
    <div className="w-16 h-7 rounded border border-white/10 overflow-hidden flex p-0.5 gap-0.5" style={{ background: task.bgColor }}>
      {task.boxes.slice(0, 4).map((box) => (
        <div key={box.id} className="flex-1 rounded-[3px]" style={{ background: box.bgColor }} />
      ))}
    </div>
  );
}

export function ProfilePage({
  user,
  onBackToTasks,
  onLogout,
  onOpenHistoryTask,
  onProfileUpdated,
  onError,
}: ProfilePageProps) {
  const userId = user.id;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [daily, setDaily] = useState<DailyStatsItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dailyRefreshing, setDailyRefreshing] = useState(false);
  const [activityRange, setActivityRange] = useState<ActivityRange>("week");
  const [tab, setTab] = useState<Tab>("history");
  const [activeBadgeFilter, setActiveBadgeFilter] = useState<BadgeKind | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [countryCode, setCountryCode] = useState(user.country_code ?? "");
  const [workplacePreset, setWorkplacePreset] = useState<string>(() => {
    const w = user.workplace?.trim();
    if (!w) return "";
    return WORKPLACE_PRESETS.includes(w as (typeof WORKPLACE_PRESETS)[number]) ? w : "Other";
  });
  const [workplaceCustom, setWorkplaceCustom] = useState(() => {
    const w = user.workplace?.trim();
    if (!w) return "";
    return WORKPLACE_PRESETS.includes(w as (typeof WORKPLACE_PRESETS)[number]) ? "" : w;
  });
  const [avatarVariant, setAvatarVariant] = useState(user.avatar_variant);
  const [avatarImageData, setAvatarImageData] = useState<string | null>(user.avatar_image_data ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);

  const statsRef = useRef(stats);
  statsRef.current = stats;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!editOpen) {
      setNickname(user.nickname ?? "");
      setCountryCode(user.country_code ?? "");
      const w = user.workplace?.trim();
      if (!w) {
        setWorkplacePreset("");
        setWorkplaceCustom("");
      } else if (WORKPLACE_PRESETS.includes(w as (typeof WORKPLACE_PRESETS)[number])) {
        setWorkplacePreset(w);
        setWorkplaceCustom("");
      } else {
        setWorkplacePreset("Other");
        setWorkplaceCustom(w);
      }
      setAvatarVariant(user.avatar_variant);
      setAvatarImageData(user.avatar_image_data ?? null);
    }
  }, [user, editOpen]);

  useLayoutEffect(() => {
    setActivityRange("week");
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setHistoryLoading(true);
      try {
        const historyRows = await fetchUserHistory(userId);
        if (!cancelled) setItems(historyRows);
      } catch {
        if (!cancelled) onErrorRef.current("Could not load history");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (tab !== "stats") return;
    let cancelled = false;

    const pull = async (showOverlay: boolean) => {
      if (showOverlay) {
        if (statsRef.current) setDailyRefreshing(true);
        else setStatsLoading(true);
      }
      try {
        const statsPayload = await fetchUserStats(userId, activityRange);
        if (cancelled) return;
        setStats(statsPayload.stats);
        setDaily(statsPayload.daily);
        setHeatmap(statsPayload.heatmap);
      } catch {
        if (!cancelled && showOverlay) onErrorRef.current("Could not load statistics");
      } finally {
        if (!cancelled && showOverlay) {
          setStatsLoading(false);
          setDailyRefreshing(false);
        }
      }
    };

    void pull(true);
    const intervalId = window.setInterval(() => void pull(false), 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tab, userId, activityRange]);

  const filteredItems = activeBadgeFilter
    ? items.filter((i) => {
        const badge = scoreBadge(i.best_score);
        if (activeBadgeFilter === "solved") return badge === "solved" || badge === "flawless";
        return badge === activeBadgeFilter;
      })
    : items;

  const name = displayNameOf(user);
  const previewName = editOpen ? nickname.trim() || user.email.split("@")[0] : name;
  const previewInitials = initialsOf(previewName);
  const previewVariant = editOpen ? avatarVariant : user.avatar_variant;
  const previewAvatarImage = editOpen ? avatarImageData : user.avatar_image_data;
  const [g0, g1] = AVATAR_GRADIENTS[previewVariant % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
  const countryName = COUNTRIES.find((c) => c.code === user.country_code)?.name;

  async function saveProfile() {
    const preset = workplacePreset.trim();
    const custom = workplaceCustom.trim();
    const workplace =
      preset === "Other"
        ? custom || null
        : preset.length > 0
          ? preset
          : null;
    const body: ProfileUpdate = {
      nickname: nickname.trim(),
      country_code: countryCode.trim().length === 2 ? countryCode.trim().toUpperCase() : null,
      workplace,
      avatar_variant: avatarVariant,
      avatar_image_data: avatarImageData,
    };
    setSavingProfile(true);
    try {
      const next = await updateProfile(userId, body);
      onProfileUpdated(next);
      setEditOpen(false);
    } catch {
      onError("Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarPicked(file: File | null) {
    if (!file) return;
    try {
      const next = await toAvatarDataUrl(file);
      setAvatarImageData(next);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not process avatar image";
      onError(msg);
    }
  }

  return (
    <div className="min-h-screen bg-[#101215] text-white p-4 sm:p-6">
      <div className="mx-auto max-w-[1120px] space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#1a1d24] via-[#14161c] to-[#101215] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: `linear-gradient(135deg, ${g0}, ${g1})` }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                className="group relative h-[92px] w-[92px] shrink-0 rounded-2xl ring-2 ring-white/[0.12] transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(145deg, ${g0}, ${g1})` }}
                title="Change avatar style in profile settings"
              >
                {previewAvatarImage ? (
                  <img src={previewAvatarImage} alt="avatar" className="absolute inset-0 h-full w-full rounded-2xl object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-tight text-white drop-shadow-md">
                    {previewInitials}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-semibold text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                  edit
                </span>
              </button>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
                  {user.country_code ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-sm" title={countryName ?? user.country_code}>
                      <span className="text-lg leading-none">{flagEmoji(user.country_code)}</span>
                      <span className="text-white/70">{countryName ?? user.country_code}</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-white/45">{user.email}</p>
                {user.workplace ? (
                  <p className="flex items-center gap-2 text-[13px] text-white/55">
                    <span className="text-white/35" aria-hidden>
                      ◆
                    </span>
                    {user.workplace}
                  </p>
                ) : (
                  <p className="text-[13px] text-white/35">No workplace set</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                className="rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/[0.1]"
              >
                {editOpen ? "Close" : "Edit profile"}
              </button>
              <button
                type="button"
                onClick={onBackToTasks}
                className="rounded-xl border border-white/12 bg-black/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
              >
                Back to tasks
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-red-500/45 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/30"
              >
                Log out
              </button>
            </div>
          </div>

          {editOpen ? (
            <div className="relative mt-6 space-y-4 border-t border-white/[0.08] pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Nickname</span>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm outline-none ring-teal-400/0 transition-[box-shadow] focus:ring-2 focus:ring-teal-400/35"
                    placeholder="Display name"
                    maxLength={40}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Country</span>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400/35"
                  >
                    <option value="">Not set</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {flagEmoji(c.code)} {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Workplace</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={workplacePreset}
                      onChange={(e) => setWorkplacePreset(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm sm:max-w-xs"
                    >
                      <option value="">Not set</option>
                      {WORKPLACE_PRESETS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    {workplacePreset === "Other" ? (
                      <input
                        value={workplaceCustom}
                        onChange={(e) => setWorkplaceCustom(e.target.value)}
                        placeholder="Describe (up to 80 characters)"
                        maxLength={80}
                        className="w-full flex-1 rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm"
                      />
                    ) : null}
                  </div>
                </label>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Avatar style</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVATAR_GRADIENTS.map(([a, b], i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarVariant(i)}
                      className={`h-9 w-9 rounded-lg ring-2 transition-transform hover:scale-105 ${
                        avatarVariant === i ? "ring-white/70 scale-105" : "ring-transparent"
                      }`}
                      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0] ?? null;
                      void handleAvatarPicked(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="rounded-lg border border-sky-300/30 bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-400/22"
                  >
                    Upload PNG/JPG
                  </button>
                  {avatarImageData ? (
                    <button
                      type="button"
                      onClick={() => setAvatarImageData(null)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/[0.06]"
                    >
                      Remove image
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => void saveProfile()}
                  className="rounded-xl bg-teal-400/90 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="flex w-fit overflow-hidden rounded-xl border border-white/[0.12] text-xs font-semibold uppercase tracking-[0.12em]">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`px-5 py-2.5 ${tab === "history" ? "bg-white text-slate-900" : "bg-transparent text-white/50 hover:text-white/75"}`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setTab("stats")}
            className={`px-5 py-2.5 ${tab === "stats" ? "bg-white text-slate-900" : "bg-transparent text-white/50 hover:text-white/75"}`}
          >
            Statistics
          </button>
        </div>

        {tab === "history" ? (
          <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#171a1f] shadow-[0_10px_34px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              {(["unfinished", "in_progress", "solved", "flawless"] as BadgeKind[]).map((kind) => {
                const count = items.filter((i) => scoreBadge(i.best_score) === kind).length;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setActiveBadgeFilter((prev) => (prev === kind ? null : kind))}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass(kind, activeBadgeFilter === kind)}`}
                  >
                    {badgeLabel(kind)} · {count}
                  </button>
                );
              })}
              {activeBadgeFilter ? (
                <button
                  type="button"
                  onClick={() => setActiveBadgeFilter(null)}
                  className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/70 hover:text-white"
                >
                  Clear filter
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-[minmax(64px,0.45fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(220px,1.45fr)_minmax(120px,0.9fr)_minmax(132px,0.85fr)_minmax(156px,0.95fr)] gap-0 border-b border-white/[0.08] text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Task</span>
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Theme</span>
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Mode</span>
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Status</span>
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Last activity</span>
              <span className="border-r border-white/[0.08] px-2 py-3 sm:px-3">Action</span>
              <span className="px-2 py-3 sm:px-3">Date</span>
            </div>
            {historyLoading ? (
              <div className="space-y-2 p-4">
                <div className="h-8 rounded skeleton" />
                <div className="h-8 rounded skeleton" />
                <div className="h-8 rounded skeleton" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-4 text-sm text-white/50">No attempts yet. Press Check on any task.</div>
            ) : (
              filteredItems.map((a) => (
                <div
                  key={a.task_id}
                  className="grid grid-cols-[minmax(64px,0.45fr)_minmax(72px,0.5fr)_minmax(72px,0.5fr)_minmax(220px,1.45fr)_minmax(120px,0.9fr)_minmax(132px,0.85fr)_minmax(156px,0.95fr)] gap-0 border-b border-white/[0.06] text-center text-sm items-center"
                >
                  <span className="border-r border-white/[0.06] px-2 py-3 font-mono text-[13px] text-white/70 sm:px-3">{a.task_id}</span>
                  <div className="flex justify-center border-r border-white/[0.06] px-2 py-3 sm:px-3">
                    <ThemePreview task={a.task_config} />
                  </div>
                  <span className="border-r border-white/[0.06] px-2 py-3 font-mono text-[12px] font-semibold text-white/70 sm:px-3">
                    {a.last_editor_mode === "tsx" ? "TSX" : "HTML"}
                  </span>
                  <div className="flex justify-center border-r border-white/[0.06] px-2 py-2.5 sm:px-3">
                    <button
                      type="button"
                      onClick={() => setActiveBadgeFilter(scoreBadge(a.best_score))}
                      className={`inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full border px-3 py-1.5 text-left text-[12px] font-semibold leading-tight sm:text-[13px] ${badgeClass(scoreBadge(a.best_score))}`}
                      title={`${a.best_score}%`}
                    >
                      <span className="font-mono">{badgeLabel(scoreBadge(a.best_score))}</span>
                      <span className="mx-1 text-white/35">·</span>
                      <span className={`font-mono tabular-nums ${scoreTone(a.best_score)}`}>{a.best_score}%</span>
                    </button>
                  </div>
                  <span className="border-r border-white/[0.06] px-2 py-3 text-[12px] text-white/60 sm:px-3 sm:text-[13px]">
                    {formatRelativeEn(a.last_attempt_at)}
                  </span>
                  <div className="flex justify-center border-r border-white/[0.06] px-2 py-2.5 sm:px-3">
                    <button
                      type="button"
                      className="whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold text-white/90 hover:bg-white/[0.1] sm:text-xs"
                      onClick={() => {
                        void (async () => {
                          try {
                            const task = await fetchTaskById(a.task_id);
                            onOpenHistoryTask({
                              taskId: a.task_id,
                              task,
                              code: a.last_code,
                              mode: a.last_editor_mode,
                            });
                          } catch {
                            onError("Could not open task from history");
                          }
                        })();
                      }}
                    >
                      Open task
                    </button>
                  </div>
                  <span className="px-2 py-3 text-[11px] leading-snug text-white/45 sm:px-3 sm:text-xs">
                    {formatAbsoluteDate(a.last_attempt_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : statsLoading && !stats ? (
          <div className="space-y-2 rounded-2xl border border-white/[0.1] bg-[#171a1f] p-4 shadow-[0_10px_34px_rgba(0,0,0,0.35)]">
            <div className="h-16 rounded skeleton" />
            <div className="h-16 rounded skeleton" />
            <div className="h-16 rounded skeleton" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {(() => {
              const hasTasks = stats.attempted_tasks_count > 0;
              const hasSolved = stats.solved_95_count > 0;
              const hasChecks = stats.total_checks > 0;
              return (
                <>
            <div className="rounded-2xl border border-white/[0.08] bg-[#141619] p-5 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.28)]">
              <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-x-20 lg:gap-y-10 lg:items-start">
                <div>
                  <div className="mb-4 text-[13px] font-medium text-white/70">Status distribution</div>
                  <DonutChart stats={stats} />
                </div>
                <ActivityChart
                  daily={daily}
                  range={activityRange}
                  onRangeChange={setActivityRange}
                  loading={dailyRefreshing}
                />
              </div>
              <ActivityHeatmap rows={heatmap} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                title="Solved (95%+)"
                value={`${stats.solved_95_count}`}
                hint={hasTasks ? `${formatPercent(stats.solved_95_percent)}% of all tasks` : "—"}
                tone="green"
              />
              <StatCard
                title="Flawless"
                value={`${stats.flawless_count}`}
                hint={
                  hasSolved
                    ? `${formatPercent(stats.flawless_rate_of_solved)}% of solved · ${formatPercent(stats.flawless_percent)}% of all`
                    : "—"
                }
                tone="violet"
              />
              <StatCard
                title="Checks"
                value={`${stats.total_checks}`}
                hint={hasTasks ? `~${formatPercent(stats.checks_per_task)} per task` : "—"}
                tone="yellow"
              />
              <StatCard
                title="Acceptance"
                value={hasChecks ? `${formatPercent(stats.acceptance_percent)}%` : "—"}
                hint={hasChecks ? "Share of checks scoring 95%+" : "—"}
                tone={stats.acceptance_percent >= 70 ? "green" : stats.acceptance_percent >= 40 ? "yellow" : "red"}
              />
            </div>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
