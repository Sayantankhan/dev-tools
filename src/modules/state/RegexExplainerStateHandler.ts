import { useState, useCallback, useRef, useEffect } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export interface RegexMatch {
  text: string;
  index: number;
  groups?: string[];
}

export const RegexExplainerStateHandler = (): ToolHandler => {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [sampleText, setSampleText] = useState("");
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const helpers = {
    explainPattern: (regexPattern: string): string => {
      if (!regexPattern) return "Enter a regex pattern to see explanation";

      const explanations: string[] = [];

      // Common patterns
      if (regexPattern.includes("\\d")) explanations.push("\\d = any digit (0-9)");
      if (regexPattern.includes("\\w")) explanations.push("\\w = any word character (a-z, A-Z, 0-9, _)");
      if (regexPattern.includes("\\s")) explanations.push("\\s = any whitespace");
      if (regexPattern.includes(".")) explanations.push(". = any character except newline");
      if (regexPattern.includes("^")) explanations.push("^ = start of string/line");
      if (regexPattern.includes("$")) explanations.push("$ = end of string/line");
      if (regexPattern.includes("*")) explanations.push("* = 0 or more times");
      if (regexPattern.includes("+")) explanations.push("+ = 1 or more times");
      if (regexPattern.includes("?")) explanations.push("? = 0 or 1 time (optional)");
      if (regexPattern.includes("|")) explanations.push("| = OR operator");
      if (regexPattern.includes("[")) explanations.push("[...] = character class");
      if (regexPattern.includes("(")) explanations.push("(...) = capturing group");
      if (regexPattern.includes("(?:")) explanations.push("(?:...) = non-capturing group");
      if (regexPattern.includes("{")) explanations.push("{n,m} = between n and m times");

      return explanations.length > 0 
        ? explanations.join("\n") 
        : "Pattern breakdown: " + regexPattern;
    },

    findMatches: (regexPattern: string, regexFlags: string, text: string): RegexMatch[] => {
      if (!regexPattern || !text) return [];

      try {
        const regex = new RegExp(regexPattern, regexFlags);
        const foundMatches: RegexMatch[] = [];
        let match;

        if (regexFlags.includes("g")) {
          while ((match = regex.exec(text)) !== null) {
            foundMatches.push({
              text: match[0],
              index: match.index,
              groups: match.slice(1),
            });
          }
        } else {
          match = regex.exec(text);
          if (match) {
            foundMatches.push({
              text: match[0],
              index: match.index,
              groups: match.slice(1),
            });
          }
        }

        return foundMatches;
      } catch (error) {
        return [];
      }
    },

    validateRegex: (regexPattern: string): string => {
      if (!regexPattern) return "";
      
      try {
        new RegExp(regexPattern);
        return "";
      } catch (error: any) {
        return error.message || "Invalid regex pattern";
      }
    },
  };
  
  const performMatching = useCallback((regexPattern: string, regexFlags: string, text: string) => {
    const validationError = helpers.validateRegex(regexPattern);
    setError(validationError);
    
    if (!validationError && regexPattern) {
      setExplanation(helpers.explainPattern(regexPattern));
      const foundMatches = helpers.findMatches(regexPattern, regexFlags, text);
      setMatches(foundMatches);
    } else {
      setMatches([]);
      setExplanation(regexPattern ? "" : "Enter a regex pattern to see explanation");
    }
  }, []);

  const actions = {
    updatePattern: (value: string) => {
      setPattern(value);
      
      // Debounce expensive regex matching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        performMatching(value, flags, sampleText);
      }, 300);
    },

    updateFlags: (value: string) => {
      setFlags(value);
      
      // Debounce expensive regex matching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        performMatching(pattern, value, sampleText);
      }, 300);
    },

    updateSampleText: (value: string) => {
      setSampleText(value);
      
      // Debounce expensive regex matching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        performMatching(pattern, flags, value);
      }, 300);
    },

    applyPreset: (preset: string) => {
      let presetPattern = "";

      switch (preset) {
        case "email":
          presetPattern = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";
          break;
        case "url":
          presetPattern = "https?://[\\w.-]+(?:\\.[\\w\\.-]+)+[\\w\\-\\._~:/?#[\\]@!\\$&'\\(\\)\\*\\+,;=.]+";
          break;
        case "phone":
          presetPattern = "\\+?\\d{1,3}?[-.\\s]?\\(?\\d{1,4}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}";
          break;
        case "ipv4":
          presetPattern = "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b";
          break;
        case "date":
          presetPattern = "\\d{4}-\\d{2}-\\d{2}";
          break;
        default:
          return;
      }

      setPattern(presetPattern);
      setError("");
      setExplanation(helpers.explainPattern(presetPattern));
      const foundMatches = helpers.findMatches(presetPattern, flags, sampleText);
      setMatches(foundMatches);
      toast.success("Preset applied!");
    },

    handleCopy: async () => {
      try {
        await navigator.clipboard.writeText(pattern);
        toast.success("Pattern copied!");
      } catch (error) {
        toast.error("Failed to copy");
      }
    },

    handleClear: () => {
      setPattern("");
      setSampleText("");
      setMatches([]);
      setExplanation("");
      setError("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      pattern,
      flags,
      sampleText,
      matches,
      explanation,
      error,
    },
    setters: {
      setPattern,
      setFlags,
      setSampleText,
      setMatches,
      setExplanation,
      setError,
    },
    helpers,
    actions,
  };
};