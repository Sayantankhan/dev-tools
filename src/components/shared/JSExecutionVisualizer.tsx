import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExecutionStep {
  line: number;
  stack: string[];
  heap: Record<string, any>;
  eventQueue: string[];
  microtaskQueue: string[];
}

interface JSExecutionVisualizerProps {
  currentStep: ExecutionStep | null;
}

export const JSExecutionVisualizer = ({ currentStep }: JSExecutionVisualizerProps) => {
  if (!currentStep) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Run code to see execution visualization
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Call Stack */}
      <Card className="p-4 bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-semibold text-sm">Call Stack</h3>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {currentStep.stack.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Empty</div>
            ) : (
              currentStep.stack.map((frame, idx) => (
                <Badge
                  key={idx}
                  variant={idx === currentStep.stack.length - 1 ? "default" : "outline"}
                  className="w-full justify-start font-mono text-xs"
                >
                  {frame}
                </Badge>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Heap/Variables */}
      <Card className="p-4 bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <h3 className="font-semibold text-sm">Heap / Variables</h3>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {Object.keys(currentStep.heap).length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No variables</div>
            ) : (
              Object.entries(currentStep.heap).map(([key, value]) => (
                <div key={key} className="text-xs font-mono">
                  <span className="text-primary font-semibold">{key}:</span>{" "}
                  <span className="text-muted-foreground">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Event Loop Queues */}
      <Card className="p-4 bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <h3 className="font-semibold text-sm">Event Loop</h3>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">Microtask Queue</div>
              {currentStep.microtaskQueue.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Empty</div>
              ) : (
                <div className="space-y-1">
                  {currentStep.microtaskQueue.map((task, idx) => (
                    <Badge key={idx} variant="secondary" className="w-full justify-start font-mono text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">Task Queue</div>
              {currentStep.eventQueue.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Empty</div>
              ) : (
                <div className="space-y-1">
                  {currentStep.eventQueue.map((task, idx) => (
                    <Badge key={idx} variant="outline" className="w-full justify-start font-mono text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};
