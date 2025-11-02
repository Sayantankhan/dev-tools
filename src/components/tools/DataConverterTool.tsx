import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Copy, Trash2, ArrowRight } from "lucide-react";
import { DataConverterStateHandler } from "@/modules/state/DataConverterStateHandler";

export const DataConverterTool = () => {
  const { state, setters, actions } = DataConverterStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="min-w-[120px]">
          <Label>From</Label>
          <Select value={state.fromFormat} onValueChange={(v: any) => setters.setFromFormat(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
              <SelectItem value="yaml">YAML</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={actions.handleSwap} variant="outline" size="icon" className="mt-6">
          <ArrowLeftRight className="w-4 h-4" />
        </Button>

        <div className="min-w-[120px]">
          <Label>To</Label>
          <Select value={state.toFormat} onValueChange={(v: any) => setters.setToFormat(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
              <SelectItem value="yaml">YAML</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={actions.handleConvert} className="btn-gradient mt-6">
          <ArrowRight className="w-4 h-4 mr-2" />
          Convert
        </Button>

        <Button onClick={actions.handleCopy} variant="outline" disabled={!state.output} className="mt-6">
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>

        <Button onClick={actions.handleClear} variant="outline" className="mt-6">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Input/Output */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Input ({state.fromFormat.toUpperCase()})</Label>
          <Textarea
            value={state.input}
            onChange={(e) => setters.setInput(e.target.value)}
            placeholder={`Enter ${state.fromFormat.toUpperCase()} data...`}
            className="code-editor min-h-[400px]"
          />
        </div>

        <div className="space-y-3">
          <Label>Output ({state.toFormat.toUpperCase()})</Label>
          <Textarea
            value={state.output}
            readOnly
            placeholder="Converted data will appear here..."
            className="code-editor min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
};
