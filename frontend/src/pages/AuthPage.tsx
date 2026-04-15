import { useState } from "react";
import { login, register } from "../api/auth";

interface AuthPageProps {
  onAuthed: () => void;
  onError: (message: string) => void;
}

type AuthMode = "login" | "register";

export function AuthPage({ onAuthed, onError }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, nickname);
      }
      onAuthed();
    } catch {
      const msg = mode === "login" ? "Invalid email or password" : "Registration failed";
      setError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !email.trim() || !password.trim() || (mode === "register" && !nickname.trim());

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090c13] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-[28%] -right-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
      </div>
      <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_top,rgba(147,197,253,0.2),transparent_52%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:auto,36px_36px,36px_36px]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1320]/90 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-[1.05fr_1fr]">
          <div className="hidden border-r border-white/10 bg-gradient-to-br from-sky-400/14 via-cyan-300/10 to-indigo-500/14 p-10 lg:flex lg:flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/25 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" />
              StyleTrain
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white">
              Train layout skills
              <br />
              like a pro.
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/72">
              Instant visual feedback, challenge history, and adaptive tasks in HTML or TSX mode.
            </p>
            <div className="mt-auto space-y-3 text-sm text-white/70">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">- Pixel-accurate checks in one click</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">- Daily progress analytics and heatmaps</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">- Resume any task from profile history</div>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="mb-6 lg:hidden">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" />
                StyleTrain
              </div>
            </div>

            <div className="flex rounded-xl border border-white/[0.12] bg-[#11192a] p-1 text-[11px] uppercase tracking-[0.16em]">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg py-2.5 font-semibold transition ${
                  mode === "login" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-white/55 hover:text-white/80"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-lg py-2.5 font-semibold transition ${
                  mode === "register" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-white/55 hover:text-white/80"
                }`}
              >
                Register
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {mode === "register" ? (
                <label className="block">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Nickname</div>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="How should we call you?"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
              ) : null}
              <label className="block">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Email</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Password</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-3.5 py-2.5 text-sm outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="Enter password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !disabled) {
                      void submit();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs font-medium text-white/65 transition hover:text-white"
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              onClick={() => {
                void submit();
              }}
              disabled={disabled}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 px-4 py-2.5 text-sm font-semibold text-[#06202f] shadow-[0_10px_24px_rgba(56,189,248,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="spinner" /> Loading...
                </span>
              ) : mode === "login" ? (
                "Sign in to StyleTrain"
              ) : (
                "Create StyleTrain account"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
