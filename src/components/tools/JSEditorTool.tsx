import { Button } from "@/components/ui/button";
import { Play, Trash2, Code, Eye, EyeOff } from "lucide-react";
import { JSEditorStateHandler } from "@/modules/state/JSEditorStateHandler";
import { JSExecutionVisualizer } from "@/components/shared/JSExecutionVisualizer";
import Editor from "@monaco-editor/react";

const SectionLabel = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
    {hint && <span className="text-[10px] font-mono text-muted-foreground/70">{hint}</span>}
  </div>
);

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground">
    {children}
  </kbd>
);

export const JSEditorTool = () => {
  const { state, setters, actions } = JSEditorStateHandler();
  const hasOutput = state.output.length > 0 || state.error;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Button onClick={actions.handleRun} size="sm" className="h-8 gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Run
          </Button>
          <Button onClick={actions.handleFormat} size="sm" variant="ghost" className="h-8 gap-1.5">
            <Code className="w-3.5 h-3.5" />
            Format
          </Button>
          <Button onClick={actions.handleClear} size="sm" variant="ghost" className="h-8 gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setters.setVisualizeExecution(!state.visualizeExecution)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {state.visualizeExecution ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Visualize
          </button>
          {state.metrics.length > 0 && (
            <div className="flex gap-3 text-[11px] font-mono text-muted-foreground">
              {state.metrics.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        <SectionLabel hint="javascript">Source</SectionLabel>
        <div className="flex-1 min-h-0 rounded-md border border-border overflow-hidden bg-card">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={state.code}
            onChange={(value) => setters.setCode(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              fontFamily: "'JetBrains Mono', monospace",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      {/* Visualization */}
      {state.visualizeExecution && (
        <div className="flex-1 min-h-0 flex flex-col">
          <SectionLabel hint="call stack · heap · loop">Execution</SectionLabel>
          <div className="flex-1 min-h-0 rounded-md border border-border p-4 bg-card overflow-auto">
            <JSExecutionVisualizer currentStep={state.currentExecutionStep} />
          </div>
        </div>
      )}

      {/* Output */}
      {hasOutput && (
        <div className="shrink-0 max-h-[200px] flex flex-col">
          <SectionLabel hint="console">Output</SectionLabel>
          <div className="rounded-md border border-border bg-card font-mono text-xs p-3 overflow-auto">
            {state.error ? (
              <div className="text-destructive whitespace-pre-wrap">
                <span className="opacity-60">error → </span>
                {state.error}
              </div>
            ) : (
              state.output.map((line, i) => (
                <div key={i} className="text-foreground whitespace-pre-wrap">
                  <span className="text-muted-foreground/40 select-none mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground shrink-0">
        <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> run · use <code className="font-mono text-foreground/70">console.log()</code> · sandboxed in your browser
      </div>
    </div>
  );
};
