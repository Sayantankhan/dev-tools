import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

interface ExecutionStep {
  line: number;
  stack: string[];
  heap: Record<string, any>;
  eventQueue: string[];
  microtaskQueue: string[];
}

export const JSEditorStateHandler = (): ToolHandler => {
  const [code, setCode] = useState('// Write your JavaScript code here\nconsole.log("Hello, World!");');
  const [output, setOutput] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [visualizeExecution, setVisualizeExecution] = useState<boolean>(false);
  const [currentExecutionStep, setCurrentExecutionStep] = useState<ExecutionStep | null>(null);
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const currentRunIdRef = useRef<number | null>(null);

  const helpers = {
    captureConsole: () => {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: any[]) => {
        logs.push(args.map(String).join(" "));
      };

      console.error = (...args: any[]) => {
        logs.push(`[ERROR] ${args.map(String).join(" ")}`);
      };

      console.warn = (...args: any[]) => {
        logs.push(`[WARN] ${args.map(String).join(" ")}`);
      };

      return {
        logs,
        restore: () => {
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
        },
      };
    },
  };

  const actions = {
    handleRun: () => {
      if (!code.trim()) {
        toast.error("Please write some code first");
        return;
      }

      setError("");
      setOutput([]);
      setCurrentExecutionStep(null);

      const runId = Date.now();
      setCurrentRunId(runId);
      if (currentRunIdRef) currentRunIdRef.current = runId;
      
      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize;

      // Scoped console that persists for async callbacks of this run
      const push = (msg: string) => {
        if (currentRunIdRef.current !== runId) return; // ignore logs from old runs
        setOutput((prev) => [...prev, msg]);
      };
      
      const scopedConsole = {
        log: (...args: any[]) => push(args.map(String).join(" ")),
        error: (...args: any[]) => push(`[ERROR] ${args.map(String).join(" ")}`),
        warn: (...args: any[]) => push(`[WARN] ${args.map(String).join(" ")}`),
      } as Console;

      try {
        if (visualizeExecution) {
          // Record a timeline of events, then play it back so the user can see
          // microtasks/tasks actually enter and leave their queues.
          type Snapshot = {
            stack: string[];
            heap: Record<string, any>;
            eventQueue: string[];
            microtaskQueue: string[];
            label: string;
          };

          const stack = ["<global>"];
          const heap: Record<string, any> = {};
          const eventQueue: string[] = [];
          const microtaskQueue: string[] = [];
          const timeline: Snapshot[] = [];
          let promiseCounter = 0;
          let timeoutCounter = 0;
          let microCounter = 0;

          const snap = (label: string) => {
            timeline.push({
              stack: [...stack],
              heap: { ...heap },
              eventQueue: [...eventQueue],
              microtaskQueue: [...microtaskQueue],
              label,
            });
          };

          // Parse variable declarations for the heap panel
          const varRegex = /(?:const|let|var)\s+(\w+)\s*=\s*([^;\n]+)/gm;
          let m;
          while ((m = varRegex.exec(code)) !== null) {
            heap[m[1]] = m[2].trim().slice(0, 40);
          }

          snap("start");

          // Instrumented setTimeout
          const sandboxSetTimeout = (fn: Function, delay: number) => {
            const id = ++timeoutCounter;
            const tag = `setTimeout#${id} (${delay}ms)`;
            eventQueue.push(tag);
            snap(`schedule ${tag}`);
            return window.setTimeout(() => {
              const idx = eventQueue.indexOf(tag);
              if (idx > -1) eventQueue.splice(idx, 1);
              stack.push(`setTimeout#${id} cb`);
              snap(`run ${tag}`);
              try { fn(); } catch (e) { /* swallow inside playback */ }
              stack.pop();
              snap(`done ${tag}`);
            }, delay);
          };

          // Instrumented queueMicrotask
          const sandboxQueueMicrotask = (fn: Function) => {
            const id = ++microCounter;
            const tag = `queueMicrotask#${id}`;
            microtaskQueue.push(tag);
            snap(`schedule ${tag}`);
            queueMicrotask(() => {
              const idx = microtaskQueue.indexOf(tag);
              if (idx > -1) microtaskQueue.splice(idx, 1);
              stack.push(tag);
              snap(`run ${tag}`);
              try { fn(); } catch (e) {}
              stack.pop();
              snap(`done ${tag}`);
            });
          };

          // Instrumented Promise: wraps .then/.catch/.finally to log microtasks
          const NativePromise = Promise;
          const wrapHandler = (label: string, handler?: any) => {
            if (typeof handler !== "function") return handler;
            return (val: any) => {
              const idx = microtaskQueue.indexOf(label);
              if (idx > -1) microtaskQueue.splice(idx, 1);
              stack.push(label);
              snap(`run ${label}`);
              try {
                const result = handler(val);
                stack.pop();
                snap(`done ${label}`);
                return result;
              } catch (e) {
                stack.pop();
                snap(`throw ${label}`);
                throw e;
              }
            };
          };

          class TrackedPromise<T> extends NativePromise<T> {
            then(onFulfilled?: any, onRejected?: any): any {
              const id = ++promiseCounter;
              const fulLabel = `Promise.then#${id}`;
              const rejLabel = `Promise.catch#${id}`;
              if (onFulfilled) microtaskQueue.push(fulLabel);
              if (onRejected) microtaskQueue.push(rejLabel);
              snap(`schedule Promise#${id}`);
              return super.then(
                wrapHandler(fulLabel, onFulfilled),
                wrapHandler(rejLabel, onRejected)
              );
            }
          }

          const func = new Function(
            "console", "setTimeout", "Promise", "queueMicrotask",
            code
          );
          func(scopedConsole, sandboxSetTimeout, TrackedPromise, sandboxQueueMicrotask);

          stack.pop();
          snap("end of script");

          // Wait long enough for any pending timers/microtasks to drain, then play back
          const maxDelay = Math.max(
            50,
            ...Array.from(code.matchAll(/setTimeout\s*\([^,]+,\s*(\d+)/g)).map((mm) => parseInt(mm[1]))
          );
          window.setTimeout(() => {
            if (currentRunIdRef.current !== runId) return;
            const stepDuration = Math.max(120, Math.min(600, 2400 / Math.max(timeline.length, 1)));
            timeline.forEach((s, i) => {
              window.setTimeout(() => {
                if (currentRunIdRef.current !== runId) return;
                setCurrentExecutionStep({
                  line: 0,
                  stack: s.stack,
                  heap: s.heap,
                  eventQueue: s.eventQueue,
                  microtaskQueue: s.microtaskQueue,
                });
              }, i * stepDuration);
            });
          }, maxDelay + 30);
        } else {
          // Normal execution without visualization
          const func = new Function("console", code);
          func(scopedConsole);
        }

        const endTime = performance.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize;
        const executionTime = (endTime - startTime).toFixed(2);
        
        // Calculate memory (only show if positive, otherwise GC happened)
        let memoryUsed: string | null = null;
        if (startMemory && endMemory) {
          const memDiff = (endMemory - startMemory) / 1024;
          memoryUsed = memDiff > 0 ? memDiff.toFixed(2) : "N/A (GC)";
        }

        const metricsData = [
          `⏱️ Execution time: ${executionTime}ms`,
          memoryUsed ? `💾 Memory used: ${memoryUsed}KB` : null,
        ].filter(Boolean) as string[];

        setMetrics(metricsData);

        toast.success("Code executed!");
      } catch (err: any) {
        const stack = err.stack || "";
        const lineMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
        const lineInfo = lineMatch ? ` at line ${lineMatch[1]}, column ${lineMatch[2]}` : "";
        
        setError(`${err.message}${lineInfo}`);
        setOutput([]);
        toast.error("Execution failed");
      }
    },

    handleFormat: () => {
      try {
        // Basic formatting - just add proper indentation
        const formatted = code
          .split("\n")
          .map((line) => line.trim())
          .join("\n");
        setCode(formatted);
        toast.success("Code formatted!");
      } catch (error) {
        toast.error("Failed to format code");
      }
    },

    handleClear: () => {
      setCode('// Write your JavaScript code here\nconsole.log("Hello, World!");');
      setOutput([]);
      setMetrics([]);
      setError("");
      setCurrentExecutionStep(null);
      setCurrentRunId(null);
      if (currentRunIdRef) currentRunIdRef.current = null;
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      code,
      output,
      metrics,
      error,
      visualizeExecution,
      currentExecutionStep,
    },
    setters: {
      setCode,
      setOutput,
      setMetrics,
      setError,
      setVisualizeExecution,
    },
    helpers,
    actions,
  };
};
