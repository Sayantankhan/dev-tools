import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Trash2, Code } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { JSEditorStateHandler } from "@/modules/state/JSEditorStateHandler";
import { JSExecutionVisualizer } from "@/components/shared/JSExecutionVisualizer";
import Editor from "@monaco-editor/react";

export const JSEditorTool = () => {
  const { state, setters, actions } = JSEditorStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-2 ml-auto">
          <Checkbox
            id="visualize"
            checked={state.visualizeExecution}
            onCheckedChange={setters.setVisualizeExecution}
          />
          <Label htmlFor="visualize" className="cursor-pointer text-sm">
            Visualize Execution
          </Label>
        </div>
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

      {/* Visualization */}
      {state.visualizeExecution && (
        <div className="space-y-3">
          <Label>Execution Visualization</Label>
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <JSExecutionVisualizer currentStep={state.currentExecutionStep} />
          </div>
        </div>
      )}

      {/* Output */}
      {(state.output.length > 0 || state.metrics.length > 0 || state.error) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Output</Label>
            {state.metrics.length > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                {state.metrics.map((metric, index) => (
                  <span key={index}>{metric}</span>
                ))}
              </div>
            )}
          </div>
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
