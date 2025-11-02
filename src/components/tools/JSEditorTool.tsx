import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Trash2, Code } from "lucide-react";
import { JSEditorStateHandler } from "@/modules/state/JSEditorStateHandler";
import Editor from "@monaco-editor/react";

export const JSEditorTool = () => {
  const { state, setters, actions } = JSEditorStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={actions.handleRun} className="btn-gradient">
          <Play className="w-4 h-4 mr-2" />
          Run Code
        </Button>
        <Button onClick={actions.handleFormat} variant="outline">
          <Code className="w-4 h-4 mr-2" />
          Format
        </Button>
        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <Label>JavaScript Code</Label>
        <div className="border border-border rounded-lg overflow-hidden">
          <Editor
            height="400px"
            defaultLanguage="javascript"
            value={state.code}
            onChange={(value) => setters.setCode(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Output */}
      {(state.output.length > 0 || state.metrics.length > 0 || state.error) && (
        <div className="space-y-3">
          <Label>Output</Label>
          <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-4">
            {/* Metrics Column */}
            {state.metrics.length > 0 && (
              <div className="code-editor p-4 min-h-[200px] max-h-[300px] overflow-auto">
                {state.metrics.map((line, index) => (
                  <div key={index} className="text-muted-foreground font-mono text-sm whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
            )}
            
            {/* Output Column */}
            <div className="code-editor p-4 min-h-[200px] max-h-[300px] overflow-auto">
              {state.error ? (
                <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                  Error: {state.error}
                </div>
              ) : (
                state.output.map((line, index) => (
                  <div key={index} className="text-foreground font-mono text-sm whitespace-pre-wrap">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
        <p>
          Write JavaScript code and click "Run Code" to execute. Use console.log(), console.error(),
          or console.warn() to see output.
        </p>
      </div>
    </div>
  );
};
