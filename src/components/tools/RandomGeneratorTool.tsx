import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Shuffle, Copy, Trash2 } from "lucide-react";
import { RandomGeneratorStateHandler } from "@/modules/state/RandomGeneratorStateHandler";

export const RandomGeneratorTool = () => {
  const { state, setters, actions } = RandomGeneratorStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[150px]">
          <Label>Format</Label>
          <Select value={state.format} onValueChange={(v: any) => setters.setFormat(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
              <SelectItem value="yaml">YAML</SelectItem>
              <SelectItem value="uuid">UUID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {state.format !== "uuid" && (
          <div className="flex-1 min-w-[200px]">
            <Label>Complexity: {state.complexity}</Label>
            <Slider
              value={[state.complexity]}
              onValueChange={(v) => setters.setComplexity(v[0])}
              min={1}
              max={5}
              step={1}
              className="mt-3"
            />
          </div>
        )}

        <Button onClick={actions.handleGenerate} className="btn-gradient">
          <Shuffle className="w-4 h-4 mr-2" />
          Generate
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

      {/* Output */}
      <div className="space-y-3">
        <Label>Generated Output</Label>
        <Textarea
          value={state.output}
          readOnly
          placeholder="Click Generate to create random data..."
          className="code-editor min-h-[400px]"
        />
      </div>

      {/* Info */}
      {state.output && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>Generated {state.format.toUpperCase()} with {state.output.length} characters</p>
        </div>
      )}
    </div>
  );
};
