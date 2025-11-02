import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wand2,
  Minimize2,
  CheckCircle2,
  GitBranch,
  Copy,
  Trash2,
  Code2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JSONStateHandler } from "@/modules/state/JsonStateHandler";


export const JSONTool = () => {
  const {
    state,
    setters,
    actions
  } = JSONStateHandler();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={actions.handlePrettify} className="btn-gradient">
          <Wand2 className="w-4 h-4 mr-2" />
          Prettify
        </Button>
        <Button onClick={actions.handleMinify} variant="outline">
          <Minimize2 className="w-4 h-4 mr-2" />
          Minify
        </Button>
        <Button onClick={actions.handleValidate} variant="outline">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Validate
        </Button>
        <Button onClick={actions.handleDestructure} variant="outline">
          <GitBranch className="w-4 h-4 mr-2" />
          Destructure
        </Button>
        <Button onClick={() => actions.handleCopy(state.output)} variant="outline" disabled={!state.output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {state.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
          {state.error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Pane */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Input JSON</Label>
          <Textarea
            value={state.input}
            onChange={(e) => setters.setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            className="code-editor min-h-[400px]"
          />
          <p className="text-xs text-muted-foreground">
            Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> to prettify
          </p>
        </div>

        {/* Output Pane */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {state.isDestructured ? "JSON Paths" : "Output"}
          </Label>
          {state.isDestructured ? (
            <div className="bg-input border border-border rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {state.paths.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start justify-between gap-3 p-3 bg-card/50 rounded-lg hover:bg-card transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-primary break-all">{item.path}</code>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {item.type}
                        </span>
                        {item.type !== "object" && item.type !== "array" && (
                          <>
                            <span className="text-xs text-foreground/70">=</span>
                            {item.isEditing ? (
                              <Input
                                value={item.editValue}
                                onChange={(e) => actions.handlePathValueChange(index, e.target.value)}
                                className="h-7 text-xs flex-1 min-w-[100px]"
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs text-foreground/70">
                                {String(item.value)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actions.handleSavePathEdit(index)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="w-3 h-3 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actions.handleCancelPathEdit(index)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {item.type !== "object" && item.type !== "array" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => actions.handleEditPath(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => actions.handleCopy(item.path, "Path")}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Textarea
              value={state.output}
              readOnly
              placeholder="Formatted JSON will appear here..."
              className="code-editor min-h-[400px]"
            />
          )}
        </div>
      </div>

      {/* JSONPath Query (Advanced) */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-sm font-medium">JSONPath Query (Optional)</Label>
        <div className="flex gap-2">
          <Input
            value={state.jsonPathQuery}
            onChange={(e) => setters.setJsonPathQuery(e.target.value)}
            placeholder="e.g., $.users[*].email"
            className="flex-1"
          />
          <Button variant="outline" onClick={actions.handleJsonPathParsing}>
            <Code2 className="w-4 h-4 mr-2" />
            Execute
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Advanced: Use JSONPath syntax to query and extract specific data
        </p>

        {/* ✅ Show output of query here */}
        {state.jsonPathParseOp && (
          <div className="pt-3">
            <Label className="text-sm font-medium">Query Result</Label>
            <Textarea
              value={state.jsonPathParseOp}
              readOnly
              placeholder="Query results will appear here..."
              className="code-editor min-h-[200px] mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
};
