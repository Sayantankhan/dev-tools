import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Trash2, Clock } from "lucide-react";
import { CronGeneratorStateHandler } from "@/modules/state/CronGeneratorStateHandler";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CronGeneratorTool = () => {
  const { state, actions } = CronGeneratorStateHandler();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cron Expression Generator</h2>
        <div className="flex gap-2">
          <Button onClick={actions.handleCopy} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button onClick={actions.handleClear} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label>Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => actions.applyPreset("every-minute")}
            variant="outline"
            size="sm"
          >
            Every Minute
          </Button>
          <Button
            onClick={() => actions.applyPreset("every-hour")}
            variant="outline"
            size="sm"
          >
            Every Hour
          </Button>
          <Button
            onClick={() => actions.applyPreset("every-day")}
            variant="outline"
            size="sm"
          >
            Every Day
          </Button>
          <Button
            onClick={() => actions.applyPreset("every-week")}
            variant="outline"
            size="sm"
          >
            Every Week
          </Button>
          <Button
            onClick={() => actions.applyPreset("every-month")}
            variant="outline"
            size="sm"
          >
            Every Month
          </Button>
        </div>
      </div>

      {/* Cron Fields */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label>Minute</Label>
          <Input
            value={state.cronFields.minute}
            onChange={(e) => actions.updateField("minute", e.target.value)}
            placeholder="* or 0-59"
          />
          <p className="text-xs text-muted-foreground">0-59 or *</p>
        </div>

        <div className="space-y-2">
          <Label>Hour</Label>
          <Input
            value={state.cronFields.hour}
            onChange={(e) => actions.updateField("hour", e.target.value)}
            placeholder="* or 0-23"
          />
          <p className="text-xs text-muted-foreground">0-23 or *</p>
        </div>

        <div className="space-y-2">
          <Label>Day of Month</Label>
          <Input
            value={state.cronFields.dayOfMonth}
            onChange={(e) => actions.updateField("dayOfMonth", e.target.value)}
            placeholder="* or 1-31"
          />
          <p className="text-xs text-muted-foreground">1-31 or *</p>
        </div>

        <div className="space-y-2">
          <Label>Month</Label>
          <Input
            value={state.cronFields.month}
            onChange={(e) => actions.updateField("month", e.target.value)}
            placeholder="* or 1-12"
          />
          <p className="text-xs text-muted-foreground">1-12 or *</p>
        </div>

        <div className="space-y-2">
          <Label>Day of Week</Label>
          <Input
            value={state.cronFields.dayOfWeek}
            onChange={(e) => actions.updateField("dayOfWeek", e.target.value)}
            placeholder="* or 0-6"
          />
          <p className="text-xs text-muted-foreground">0-6 (Sun-Sat)</p>
        </div>
      </div>

      {/* Generated Expression */}
      <div className="space-y-2">
        <Label>Generated Cron Expression</Label>
        <div className="p-4 bg-muted rounded-lg font-mono text-lg">
          {state.cronExpression}
        </div>
      </div>

      {/* Human Readable Explanation */}
      <div className="space-y-2">
        <Label>Human Readable</Label>
        <div className="p-4 bg-muted/50 rounded-lg">
          {state.cronExpression && (
            <p className="text-sm">{state.helpers?.explainCron(state.cronExpression)}</p>
          )}
        </div>
      </div>

      {/* Next Run Times */}
      {state.nextRuns && state.nextRuns.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Next 5 Run Times
          </Label>
          <div className="space-y-2">
            {state.nextRuns.map((run, index) => (
              <div
                key={index}
                className="p-3 bg-muted/30 rounded border border-border/50"
              >
                <p className="text-sm font-mono">{run}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong>Format:</strong> minute hour day month weekday
          <br />
          <strong>Special characters:</strong> * (any), / (step), , (list), - (range)
          <br />
          <strong>Examples:</strong> */5 * * * * = every 5 minutes | 0 0 * * 0 = weekly on Sunday
        </p>
      </div>
    </div>
  );
};