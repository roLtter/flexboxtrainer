import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "../../components/Editor";
import { SvgImportsPanel } from "../../components/SvgImportsPanel";
import type { InspectedItem, TaskConfig } from "../../utils/types";
import { buildTargetHtml, buildSvgColorMap } from "../../utils/htmlBuilder";
import { requestGeneratedTask, submitTaskAttempt } from "../../api/task";
import { pixelCompare } from "../../utils/pixelCompare";
import { buildSvgInjectionScript } from "../../utils/svgIcons";
import type { SvgIconName } from "../../utils/svgIcons";
import { PageHeader } from "./components/PageHeader";
import { ScoreBadge } from "./components/ScoreBadge";
import { TargetPreviewRow } from "./components/TargetPreviewRow";
import { buildPreviewDoc, TAILWIND_CDN } from "./previewDoc";
import { clearState, loadState, saveState } from "./storage";
import type { EditorMode } from "./types";

const PANEL_H = 320;

function detectModeMismatch(code: string, mode: EditorMode): string | null {
  const source = code.trim();
  if (!source) return null;

  const hasTsxOnlySyntax =
    /\bclassName\s*=/.test(source) ||
    /\bhtmlFor\s*=/.test(source) ||
    /\bstyle\s*=\s*\{\{/.test(source) ||
    /\{\s*[^}]+\s*\}/.test(source);

  const hasHtmlOnlySyntax = /\bclass\s*=/.test(source) || /\bstyle\s*=\s*["'][^"']*["']/.test(source);

  if (mode === "html" && hasTsxOnlySyntax) {
    return "You selected HTML mode, but the code looks like TSX/JSX (className, style={{...}}, or {...}). Switch to TSX mode.";
  }
  if (mode === "tsx" && hasHtmlOnlySyntax) {
    return 'You selected TSX mode, but the code looks like plain HTML (class="" or style="..."). Switch to HTML mode or rewrite in TSX style.';
  }
  return null;
}

interface MainPageProps {
  userEmail: string;
  onError: (message: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  preloadedTask?: {
    taskId: number;
    task: TaskConfig;
    code: string;
    mode?: EditorMode;
  } | null;
}

export default function MainPage({ userEmail, onError, onOpenProfile, onLogout, preloadedTask }: MainPageProps) {
  const saved = loadState();

  const panelRef = useRef<HTMLDivElement>(null);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el;
  }, []);

  const getMaxWidth = () => {
    if (panelRef.current) {
      return Math.floor(panelRef.current.clientWidth - 64);
    }
    return 480;
  };

  const [task, setTask] = useState<TaskConfig | null>(() => preloadedTask?.task ?? saved?.task ?? null);
  const [taskId, setTaskId] = useState<number | null>(() => preloadedTask?.taskId ?? saved?.taskId ?? null);
  const [code, setCode] = useState(preloadedTask?.code ?? saved?.code ?? "");
  const [mode, setMode] = useState<EditorMode>(() => preloadedTask?.mode ?? saved?.mode ?? "html");
  const [score, setScore] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<InspectedItem | null>(null);
  useEffect(() => {
    if (!task) return;
    saveState({ taskId, task, code, mode });
  }, [taskId, task, code, mode]);

  useEffect(() => {
    if (!preloadedTask) return;
    setTaskId(preloadedTask.taskId);
    setTask(preloadedTask.task);
    setCode(preloadedTask.code);
    setMode(preloadedTask.mode ?? "html");
    setScore(null);
    setSelected(null);
  }, [preloadedTask]);

  useEffect(() => {
    if (task) return;

    const bootstrapTask = async () => {
      setGenerating(true);
      try {
        const generatedTask = await requestGeneratedTask(480, 256);
        setTask(generatedTask.task);
        setTaskId(null);
        saveState({ taskId: null, task: generatedTask.task, code: "", mode: "html" });
      } catch {
        onError("Could not load a new task");
      } finally {
        setGenerating(false);
      }
    };

    void bootstrapTask();
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const timer = setTimeout(() => {
      const iframe = previewIframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc || !iframe) return;
      iframe.style.opacity = "0.3";
      doc.open();
      doc.write(buildPreviewDoc(code, mode, task));
      doc.close();
      setTimeout(() => {
        iframe.style.opacity = "1";
      }, 150);
    }, 300);

    return () => clearTimeout(timer);
  }, [code, mode, task]);

  const handleCheck = useCallback(async () => {
    if (comparing || !code.trim() || !task) return;
    const mismatchMessage = detectModeMismatch(code, mode);
    if (mismatchMessage) {
      onError(mismatchMessage);
      return;
    }
    setComparing(true);
    const colorMap = buildSvgColorMap(task);
    const svgScript = buildSvgInjectionScript(task.svgNames as SvgIconName[], colorMap);
    const targetHtml = buildTargetHtml(task);
    try {
      const nextScore = await pixelCompare(targetHtml, code, mode, TAILWIND_CDN, svgScript);
      setScore(nextScore);
      const persistedTaskId = await submitTaskAttempt(taskId, nextScore, code, mode, task);
      if (taskId === null) setTaskId(persistedTaskId);
    } catch {
      onError("Could not verify your solution");
    } finally {
      setComparing(false);
    }
  }, [comparing, code, mode, onError, task, taskId]);

  const handleNewTask = async () => {
    if (generating) return;
    clearState();
    const maxW = getMaxWidth();
    const maxH = PANEL_H - 64;
    setGenerating(true);
    try {
      const generatedTask = await requestGeneratedTask(maxW, maxH);
      setTask(generatedTask.task);
      setTaskId(null);
      setCode("");
      setScore(null);
      setSelected(null);
      saveState({ taskId: null, task: generatedTask.task, code: "", mode });
    } catch {
      onError("Could not load a new task");
    } finally {
      setGenerating(false);
    }
  };

  const handleCodeChange = useCallback((nextCode: string) => {
    setCode(nextCode);
    setScore(null);
  }, []);

  const scoreColor =
    score === null ? "" : score >= 90 ? "text-slate-100" : score >= 60 ? "text-slate-300" : "text-slate-400";

  return (
    <div className="min-h-screen bg-[#101215] text-white">
      <style>{`
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#0d0d14;}
        ::-webkit-scrollbar-thumb{background:#252535;border-radius:3px;}
        iframe{transition:opacity 0.15s ease;}
      `}</style>

      <PageHeader
        userEmail={userEmail}
        score={score}
        scoreColor={scoreColor}
        comparing={comparing}
        generating={generating}
        canCheck={Boolean(task && code.trim())}
        onCheck={handleCheck}
        onNewTask={() => {
          void handleNewTask();
        }}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />

      <div className="p-5 space-y-4 max-w-[1400px] mx-auto">
        <TargetPreviewRow
          task={task}
          generating={generating}
          selected={selected}
          panelHeight={PANEL_H}
          panelRef={panelRef}
          containerRef={containerRef}
          previewIframeRef={previewIframeRef}
          onSelect={setSelected}
        />

        {score !== null && <ScoreBadge score={score} />}
        {task && <SvgImportsPanel task={task} />}

        <Editor code={code} mode={mode} onCodeChange={handleCodeChange} onModeChange={setMode} />

      </div>
    </div>
  );
}
