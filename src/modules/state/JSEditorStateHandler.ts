import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const JSEditorStateHandler = (): ToolHandler => {
  const [code, setCode] = useState('// Write your JavaScript code here\nconsole.log("Hello, World!");');
  const [output, setOutput] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

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
    handleRun: async () => {
      if (!code.trim()) {
        toast.error("Please write some code first");
        return;
      }

      setError("");
      const { logs, restore } = helpers.captureConsole();
      
      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize;

      try {
        // Execute the code
        const func = new Function(code);
        func();

        // Wait for async operations to complete (capture logs for 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const endTime = performance.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize;
        const executionTime = (endTime - startTime).toFixed(2);
        const memoryUsed = startMemory && endMemory 
          ? ((endMemory - startMemory) / 1024).toFixed(2) 
          : null;

        const metricsData = [
          `⏱️ Execution time: ${executionTime}ms`,
          memoryUsed ? `💾 Memory used: ${memoryUsed}KB` : null,
        ].filter(Boolean) as string[];

        setMetrics(metricsData);
        setOutput(logs.length > 0 ? logs : ["Code executed successfully with no output"]);
        toast.success("Code executed!");
      } catch (err: any) {
        // Try to extract line number from error stack
        const stack = err.stack || "";
        const lineMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
        const lineInfo = lineMatch ? ` at line ${lineMatch[1]}, column ${lineMatch[2]}` : "";
        
        setError(`${err.message}${lineInfo}`);
        setOutput([]);
        toast.error("Execution failed");
      } finally {
        restore();
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
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      code,
      output,
      metrics,
      error,
    },
    setters: {
      setCode,
      setOutput,
      setMetrics,
      setError,
    },
    helpers,
    actions,
  };
};
