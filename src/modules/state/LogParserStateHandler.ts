import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const LogParserStateHandler = (): ToolHandler => {
  const [logContent, setLogContent] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logLevel, setLogLevel] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    parseLogLines: (content: string): string[] => {
      return content.split("\n").filter((line) => line.trim());
    },

    filterLogs: (lines: string[], query: string, level: string): string[] => {
      let filtered = lines;

      // Filter by search query
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter((line) => line.toLowerCase().includes(lowerQuery));
      }

      // Filter by log level
      if (level !== "all") {
        const levelPattern = new RegExp(`\\b${level}\\b`, "i");
        filtered = filtered.filter((line) => levelPattern.test(line));
      }

      return filtered;
    },

    detectLogLevel: (line: string): string => {
      const lower = line.toLowerCase();
      if (lower.includes("error")) return "error";
      if (lower.includes("warn")) return "warning";
      if (lower.includes("info")) return "info";
      if (lower.includes("debug")) return "debug";
      return "default";
    },
  };

  const actions = {
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setLogContent(content);
        const lines = helpers.parseLogLines(content);
        setFilteredLogs(lines);
        toast.success(`Loaded ${lines.length} log lines`);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    handlePaste: () => {
      if (!logContent.trim()) {
        toast.error("Please paste or upload log content");
        return;
      }
      const lines = helpers.parseLogLines(logContent);
      setFilteredLogs(lines);
      toast.success(`Parsed ${lines.length} log lines`);
    },

    handleFilter: () => {
      const lines = helpers.parseLogLines(logContent);
      const filtered = helpers.filterLogs(lines, searchQuery, logLevel);
      setFilteredLogs(filtered);
      toast.success(`Found ${filtered.length} matching lines`);
    },

    handleClear: () => {
      setLogContent("");
      setFilteredLogs([]);
      setSearchQuery("");
      setLogLevel("all");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      logContent,
      filteredLogs,
      searchQuery,
      logLevel,
      fileInputRef,
    },
    setters: {
      setLogContent,
      setFilteredLogs,
      setSearchQuery,
      setLogLevel,
    },
    helpers,
    actions,
  };
};
