import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

const MONACO_CDN = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min";

let _monacoPromise: Promise<any> | null = null;

function loadMonaco(): Promise<any> {
  if (window.monaco) return Promise.resolve(window.monaco);
  if (_monacoPromise) return _monacoPromise;

  _monacoPromise = new Promise((resolve, reject) => {
    if (window.require && window.require.config) {
      window.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
      return;
    }

    const loaderScript = document.createElement("script");
    loaderScript.src = `${MONACO_CDN}/vs/loader.min.js`;
    loaderScript.onload = () => {
      window.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
    };
    loaderScript.onerror = reject;
    document.head.appendChild(loaderScript);
  });

  return _monacoPromise;
}

interface EditorProps {
  code: string;
  mode: "html" | "tsx";
  onCodeChange: (code: string) => void;
  onModeChange: (mode: "html" | "tsx") => void;
}

const PH_HTML = `<div style="display:flex; flex-direction:row; gap:12px; padding:16px; background:#1a1a2e; width:400px; height:200px;">
    <div style="width:80px; height:80px; background:#FF4444; border-radius:8px; flex-shrink:0;"></div>
    <div style="width:60px; height:80px; background:#4CC9F0; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;">
        <img src="Search.svg" width="24" height="24" />
    </div>
</div>`;

const PH_TSX = `<div className="flex flex-row" style={{gap:'12px',padding:'16px',background:'#1a1a2e',width:'400px',height:'200px'}}>
    <div className="flex-shrink-0 rounded-lg" style={{width:'80px',height:'80px',background:'#FF4444'}} />
    <div className="flex-shrink-0 flex items-center justify-center"
        style={{width:'60px',height:'80px',background:'#4CC9F0'}}>
        <img src="Search.svg" width="24" height="24" />
    </div>
</div>`;

export function Editor({ code, mode, onCodeChange, onModeChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const initialCodeRef = useRef(code);
  const onCodeChangeRef = useRef(onCodeChange);
  const [monacoReady, setMonacoReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    loadMonaco()
      .then((monaco) => {
        if (!containerRef.current || editorRef.current) return;

        monaco.editor.defineTheme("trainer-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "tag", foreground: "4EC9B0" },
            { token: "attribute.name", foreground: "9CDCFE" },
            { token: "attribute.value", foreground: "CE9178" },
            { token: "string", foreground: "CE9178" },
            { token: "comment", foreground: "6A9955" },
            { token: "delimiter.html", foreground: "808080" },
            { token: "delimiter.bracket", foreground: "FFD700" },
          ],
          colors: {
            "editor.background": "#1e1e1e",
            "editor.foreground": "#D4D4D4",
            "editorLineNumber.foreground": "#3a3a3a",
            "editorCursor.foreground": "#aeafad",
            "editor.selectionBackground": "#264f78",
            "editor.inactiveSelectionBackground": "#3a3d41",
            "editorIndentGuide.background": "#2a2a2a",
            "editorIndentGuide.activeBackground": "#3a3a3a",
          },
        });

        const language = "html";

        const editor = monaco.editor.create(containerRef.current, {
          value: initialCodeRef.current,
          language,
          theme: "trainer-dark",
          fontSize: 12,
          lineHeight: 20,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "off",
          renderWhitespace: "none",
          renderLineHighlight: "gutter",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
          },
          padding: { top: 12, bottom: 12 },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          formatOnPaste: false,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: "off",
          parameterHints: { enabled: false },
        });

        editorRef.current = editor;

        editor.onDidChangeModelContent(() => {
          onCodeChangeRef.current(editor.getValue());
        });

        setMonacoReady(true);
      })
      .catch(() => setLoadError(true));

    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.getValue();
    if (current !== code) {
      editor.setValue(code);
    }
  }, [code]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !window.monaco) return;
    const model = editor.getModel();
    if (model) {
      window.monaco.editor.setModelLanguage(model, "html");
    }
  }, [mode]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-lg overflow-hidden border border-white/[0.12] w-fit text-[10px] font-bold uppercase tracking-[0.15em]">
        {(["html", "tsx"] as const).map((m) => (
          <button key={m} onClick={() => onModeChange(m)}
            className={`px-5 py-1.5 transition-colors ${mode === m
              ? "bg-slate-200 text-slate-900"
              : "bg-transparent text-white/45 hover:text-white/80"}`}
          >
            {m === "tsx" ? "TSX / Tailwind" : "HTML"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/[0.1] flex flex-col bg-[#16191e] shadow-[0_10px_34px_rgba(0,0,0,0.35)]">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#1e232a] px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500/70" />
          <span className="w-2 h-2 rounded-full bg-slate-400/70" />
          <span className="w-2 h-2 rounded-full bg-slate-300/70" />
          <span className="ml-1 font-mono text-[10px] text-white/20">
            {mode === "html" ? "solution.html" : "solution.tsx"}
          </span>
          {!monacoReady && !loadError && (
            <span className="ml-auto text-[10px] text-white/20 animate-pulse">Loading editor…</span>
          )}
          {loadError && (
            <span className="ml-auto text-[10px] text-rose-400/60">Monaco failed to load</span>
          )}
        </div>

        <div ref={containerRef} className="h-[400px] w-full" />
      </div>

      {!monacoReady && !loadError && (
        <div className="px-1 text-[10px] text-white/15">
          {mode === "html" ? (
            <pre className="font-mono text-[11px] text-white/20">{PH_HTML}</pre>
          ) : (
            <pre className="font-mono text-[11px] text-white/20">{PH_TSX}</pre>
          )}
        </div>
      )}
    </div>
  );
}
