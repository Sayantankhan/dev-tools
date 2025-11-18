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
          // Enhanced execution with visualization
          const executionContext = {
            stack: ["<global>"],
            heap: {} as Record<string, any>,
            eventQueue: [] as string[],
            microtaskQueue: [] as string[],
          };

          // Create instrumented console and environment
          const instrumentedEnv = {
            console: scopedConsole,
            setTimeout: (fn: Function, delay: number) => {
              executionContext.eventQueue.push(`setTimeout(${delay}ms)`);
              setCurrentExecutionStep({ line: 0, ...executionContext });
              return window.setTimeout(() => {
                executionContext.stack.push("setTimeout callback");
                setCurrentExecutionStep({ line: 0, ...executionContext });
                fn();
                executionContext.stack.pop();
                const idx = executionContext.eventQueue.indexOf(`setTimeout(${delay}ms)`);
                if (idx > -1) executionContext.eventQueue.splice(idx, 1);
                setCurrentExecutionStep({ line: 0, ...executionContext });
              }, delay);
            },
            Promise: class InstrumentedPromise<T> extends Promise<T> {
              constructor(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void) {
                super((resolve, reject) => {
                  executor(
                    (value) => {
                      executionContext.microtaskQueue.push("Promise.then");
                      setCurrentExecutionStep({ line: 0, ...executionContext });
                      queueMicrotask(() => {
                        const idx = executionContext.microtaskQueue.indexOf("Promise.then");
                        if (idx > -1) executionContext.microtaskQueue.splice(idx, 1);
                        setCurrentExecutionStep({ line: 0, ...executionContext });
                      });
                      resolve(value);
                    },
                    reject
                  );
                });
              }
            },
          };

          // Parse code to track variable declarations
          const varRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(.+?)(?:;|$)/gm;
          let match;
          while ((match = varRegex.exec(code)) !== null) {
            const [, varName] = match;
            executionContext.heap[varName] = "undefined";
          }

          setCurrentExecutionStep({ line: 0, ...executionContext });

          // Execute with instrumentation
          const func = new Function(
            "console",
            "setTimeout", 
            "Promise",
            `
            ${code}
            `
          );
          
          func(instrumentedEnv.console, instrumentedEnv.setTimeout, instrumentedEnv.Promise);

          // Update visualization after execution
          executionContext.stack = [];
          setCurrentExecutionStep({ line: code.split("\n").length, ...executionContext });
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
