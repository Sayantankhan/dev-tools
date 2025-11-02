import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

type TimeUnit = "ms" | "sec" | "min" | "hour" | "day";
type MemoryUnit = "bytes" | "kb" | "mb" | "gb" | "tb" | "pb" | "eb";

const timeConversions = {
  ms: 1,
  sec: 1000,
  min: 60000,
  hour: 3600000,
  day: 86400000,
};

const memoryConversions = {
  bytes: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
  pb: 1024 ** 5,
  eb: 1024 ** 6,
};

export const ConverterStateHandler = (): ToolHandler => {
  const [converterType, setConverterType] = useState<"time" | "memory">("time");
  const [inputValue, setInputValue] = useState("");
  const [inputUnit, setInputUnit] = useState<TimeUnit | MemoryUnit>("ms");
  const [outputUnit, setOutputUnit] = useState<TimeUnit | MemoryUnit>("sec");
  const [result, setResult] = useState("");

  const helpers = {
    convertTime: (value: number, from: TimeUnit, to: TimeUnit): number => {
      const inMs = value * timeConversions[from];
      return inMs / timeConversions[to];
    },

    convertMemory: (value: number, from: MemoryUnit, to: MemoryUnit): number => {
      const inBytes = value * memoryConversions[from];
      return inBytes / memoryConversions[to];
    },

    formatResult: (value: number): string => {
      if (value >= 1000000) {
        return value.toExponential(6);
      }
      return value.toFixed(6).replace(/\.?0+$/, "");
    },
  };

  const actions = {
    handleConvert: () => {
      const value = parseFloat(inputValue);

      if (isNaN(value)) {
        toast.error("Please enter a valid number");
        return;
      }

      if (value < 0) {
        toast.error("Value must be positive");
        return;
      }

      try {
        let converted: number;

        if (converterType === "time") {
          converted = helpers.convertTime(value, inputUnit as TimeUnit, outputUnit as TimeUnit);
        } else {
          converted = helpers.convertMemory(value, inputUnit as MemoryUnit, outputUnit as MemoryUnit);
        }

        setResult(helpers.formatResult(converted));
        toast.success("Converted successfully!");
      } catch (error) {
        toast.error("Conversion failed");
      }
    },

    handleSwap: () => {
      const temp = inputUnit;
      setInputUnit(outputUnit);
      setOutputUnit(temp);

      if (result) {
        setInputValue(result);
        setResult("");
      }

      toast.success("Units swapped!");
    },

    handleCopy: async () => {
      if (!result) {
        toast.error("Nothing to copy");
        return;
      }

      try {
        await navigator.clipboard.writeText(result);
        toast.success("Copied to clipboard!");
      } catch (error) {
        toast.error("Failed to copy");
      }
    },

    handleClear: () => {
      setInputValue("");
      setResult("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      converterType,
      inputValue,
      inputUnit,
      outputUnit,
      result,
    },
    setters: {
      setConverterType,
      setInputValue,
      setInputUnit,
      setOutputUnit,
      setResult,
    },
    helpers,
    actions,
  };
};
