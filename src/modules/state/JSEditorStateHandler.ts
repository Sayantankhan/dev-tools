import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const JSEditorStateHandler = (): ToolHandler => {
  const [code, setCode] = useState('// Write your JavaScript code here\nconsole.log("Hello, World!");');
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const helpers = {
    captureConsole: () => {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: any[]) => {
        logs.push(`[LOG] ${args.map(String).join(" ")}`);
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
      const { logs, restore } = helpers.captureConsole();

      try {
        // Execute the code
        const func = new Function(code);
        func();

        setOutput(logs.length > 0 ? logs : ["Code executed successfully with no output"]);
        toast.success("Code executed!");
      } catch (err: any) {
        setError(err.message);
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
      setError("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      code,
      output,
      error,
    },
    setters: {
      setCode,
      setOutput,
      setError,
    },
    helpers,
    actions,
  };
};
