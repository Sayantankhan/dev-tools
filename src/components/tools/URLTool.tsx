import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Unlock, FileSearch, Copy, Trash2 } from "lucide-react";
import { URLStateHandler } from "@/modules/state/URLStateHandler";

export const URLTool = () => {
  const { state, setters, actions } = URLStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={actions.handleEncode} className="btn-gradient">
          <Lock className="w-4 h-4 mr-2" />
          Encode
        </Button>
        <Button onClick={actions.handleDecode} variant="outline">
          <Unlock className="w-4 h-4 mr-2" />
          Decode
        </Button>
        <Button onClick={actions.handleParse} variant="outline">
          <FileSearch className="w-4 h-4 mr-2" />
          Parse URL
        </Button>
        <Button onClick={actions.handleCopy} variant="outline" disabled={!state.output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Input/Output */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <Label>Input URL</Label>
          <Textarea
            value={state.input}
            onChange={(e) => setters.setInput(e.target.value)}
            placeholder="Enter URL here... (e.g., https://example.com/path?param=value)"
            className="code-editor min-h-[300px]"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <Label>Output</Label>
          <Textarea
            value={state.output}
            readOnly
            placeholder="Result will appear here..."
            className="code-editor min-h-[300px]"
          />
        </div>
      </div>

      {/* Parsed URL Details */}
      {state.parsedData && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Parsed URL Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Protocol</p>
                <p className="text-sm font-mono mt-1">{state.parsedData.protocol}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hostname</p>
                <p className="text-sm font-mono mt-1">{state.parsedData.hostname}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Port</p>
                <p className="text-sm font-mono mt-1">{state.parsedData.port}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pathname</p>
                <p className="text-sm font-mono mt-1">{state.parsedData.pathname || "/"}</p>
              </div>
              {state.parsedData.search && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Query String</p>
                  <p className="text-sm font-mono mt-1">{state.parsedData.search}</p>
                </div>
              )}
              {state.parsedData.hash && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hash</p>
                  <p className="text-sm font-mono mt-1">{state.parsedData.hash}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Origin</p>
                <p className="text-sm font-mono mt-1">{state.parsedData.origin}</p>
              </div>
            </div>

            {state.parsedData.parameters && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Query Parameters</p>
                <div className="space-y-2">
                  {Object.entries(state.parsedData.parameters).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-sm font-mono text-primary">{key}:</span>
                      <span className="text-sm font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      {state.output && !state.parsedData && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>Output length: {state.output.length} characters</p>
        </div>
      )}
    </div>
  );
};
