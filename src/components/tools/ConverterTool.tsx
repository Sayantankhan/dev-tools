import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Copy, Trash2, ArrowRight } from "lucide-react";
import { ConverterStateHandler } from "@/modules/state/ConverterStateHandler";

export const ConverterTool = () => {
  const { state, setters, actions } = ConverterStateHandler();

  return (
    <div className="space-y-6">
      {/* Converter Type Tabs */}
      <Tabs value={state.converterType} onValueChange={(v: any) => setters.setConverterType(v)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="time">Time Converter</TabsTrigger>
          <TabsTrigger value="memory">Memory Converter</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="space-y-6 mt-6">
          {/* Time Converter */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Value</Label>
              <Input
                type="number"
                value={state.inputValue}
                onChange={(e) => setters.setInputValue(e.target.value)}
                placeholder="Enter value..."
                className="mt-1"
              />
            </div>

            <div className="min-w-[120px]">
              <Label>From</Label>
              <Select value={state.inputUnit} onValueChange={setters.setInputUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ms">Milliseconds</SelectItem>
                  <SelectItem value="sec">Seconds</SelectItem>
                  <SelectItem value="min">Minutes</SelectItem>
                  <SelectItem value="hour">Hours</SelectItem>
                  <SelectItem value="day">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={actions.handleSwap} variant="outline" size="icon">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>

            <div className="min-w-[120px]">
              <Label>To</Label>
              <Select value={state.outputUnit} onValueChange={setters.setOutputUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ms">Milliseconds</SelectItem>
                  <SelectItem value="sec">Seconds</SelectItem>
                  <SelectItem value="min">Minutes</SelectItem>
                  <SelectItem value="hour">Hours</SelectItem>
                  <SelectItem value="day">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={actions.handleConvert} className="btn-gradient">
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert
            </Button>

            <Button onClick={actions.handleCopy} variant="outline" disabled={!state.result}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>

            <Button onClick={actions.handleClear} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-6 mt-6">
          {/* Memory Converter */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label>Value</Label>
              <Input
                type="number"
                value={state.inputValue}
                onChange={(e) => setters.setInputValue(e.target.value)}
                placeholder="Enter value..."
                className="mt-1"
              />
            </div>

            <div className="min-w-[120px]">
              <Label>From</Label>
              <Select value={state.inputUnit} onValueChange={setters.setInputUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bytes">Bytes</SelectItem>
                  <SelectItem value="kb">Kilobytes (KB)</SelectItem>
                  <SelectItem value="mb">Megabytes (MB)</SelectItem>
                  <SelectItem value="gb">Gigabytes (GB)</SelectItem>
                  <SelectItem value="tb">Terabytes (TB)</SelectItem>
                  <SelectItem value="pb">Petabytes (PB)</SelectItem>
                  <SelectItem value="eb">Exabytes (EB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={actions.handleSwap} variant="outline" size="icon">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>

            <div className="min-w-[120px]">
              <Label>To</Label>
              <Select value={state.outputUnit} onValueChange={setters.setOutputUnit}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bytes">Bytes</SelectItem>
                  <SelectItem value="kb">Kilobytes (KB)</SelectItem>
                  <SelectItem value="mb">Megabytes (MB)</SelectItem>
                  <SelectItem value="gb">Gigabytes (GB)</SelectItem>
                  <SelectItem value="tb">Terabytes (TB)</SelectItem>
                  <SelectItem value="pb">Petabytes (PB)</SelectItem>
                  <SelectItem value="eb">Exabytes (EB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={actions.handleConvert} className="btn-gradient">
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert
            </Button>

            <Button onClick={actions.handleCopy} variant="outline" disabled={!state.result}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>

            <Button onClick={actions.handleClear} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Result Display */}
      {state.result && (
        <div className="p-6 bg-card/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-2">Result:</p>
          <p className="text-3xl font-bold font-mono text-foreground">
            {state.result}{" "}
            <span className="text-lg text-muted-foreground">
              {state.outputUnit}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
