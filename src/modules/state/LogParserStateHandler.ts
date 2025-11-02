import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const LogParserStateHandler = (): ToolHandler => {
  const [logContent, setLogContent] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logLevel, setLogLevel] = useState<string>("all");
  const [fileName, setFileName] = useState<string>("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    parseLogLines: (content: string): string[] => {
      return content.split("\n").filter((line) => line.trim());
    },

    extractTimestamp: (line: string): Date | null => {
      // Common timestamp patterns in logs
      const patterns = [
        // ISO 8601: 2024-01-15T10:30:45.123Z or 2024-01-15 10:30:45
        /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/,
        // With timezone: 2024-01-15 10:30:45+00:00
        /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2})/,
        // DD/MM/YYYY HH:MM:SS or MM/DD/YYYY HH:MM:SS
        /(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/,
        // Unix timestamp in milliseconds (13 digits)
        /\b(\d{13})\b/,
        // Unix timestamp in seconds (10 digits)
        /\b(\d{10})\b/,
        // Date only fallback: 2024-01-15
        /(\d{4}-\d{2}-\d{2})/,
        // Date only: DD/MM/YYYY or MM/DD/YYYY
        /(\d{2}\/\d{2}\/\d{4})/,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const timestamp = match[1];
          
          // Handle unix timestamps
          if (/^\d{10}$/.test(timestamp)) {
            return new Date(parseInt(timestamp) * 1000);
          }
          if (/^\d{13}$/.test(timestamp)) {
            return new Date(parseInt(timestamp));
          }
          
          // Try to parse as regular date
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      
      return null;
    },

    filterLogs: (lines: string[], query: string, level: string, regex: boolean, caseSens: boolean, from: string, to: string): string[] => {
      let filtered = lines;

      // Filter by search query
      if (query.trim()) {
        if (regex) {
          try {
            const regexPattern = new RegExp(query, caseSens ? '' : 'i');
            filtered = filtered.filter((line) => regexPattern.test(line));
          } catch (error) {
            toast.error("Invalid regex pattern");
            return filtered;
          }
        } else {
          const searchTerm = caseSens ? query : query.toLowerCase();
          filtered = filtered.filter((line) => 
            caseSens ? line.includes(searchTerm) : line.toLowerCase().includes(searchTerm)
          );
        }
      }

      // Filter by log level
      if (level !== "all") {
        const levelPattern = new RegExp(`\\b${level}\\b`, "i");
        filtered = filtered.filter((line) => levelPattern.test(line));
      }

      // Filter by date/time range
      if (from || to) {
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;

        filtered = filtered.filter((line) => {
          const lineTimestamp = helpers.extractTimestamp(line);
          if (!lineTimestamp) return false; // Exclude if no timestamp found
          
          if (fromDate && lineTimestamp < fromDate) return false;
          if (toDate && lineTimestamp > toDate) return false;
          
          return true;
        });
      }

      return filtered;
    },

    detectLogLevel: (line: string): string => {
      const lower = line.toLowerCase();
      if (lower.includes("error") || lower.includes("fatal")) return "error";
      if (lower.includes("warn")) return "warning";
      if (lower.includes("info")) return "info";
      if (lower.includes("debug") || lower.includes("trace")) return "debug";
      return "default";
    },

    highlightMatch: (line: string, query: string, regex: boolean, caseSens: boolean) => {
      if (!query.trim()) return [{ text: line, highlighted: false }];

      try {
        let pattern: RegExp;
        if (regex) {
          pattern = new RegExp(`(${query})`, caseSens ? 'g' : 'gi');
        } else {
          const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern = new RegExp(`(${escapedQuery})`, caseSens ? 'g' : 'gi');
        }

        const parts = line.split(pattern);
        return parts.map((part) => ({
          text: part,
          highlighted: pattern.test(part)
        }));
      } catch {
        return [{ text: line, highlighted: false }];
      }
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

      setFileName(file.name);
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
      try {
        const lines = helpers.parseLogLines(logContent);
        const filtered = helpers.filterLogs(lines, searchQuery, logLevel, useRegex, caseSensitive, dateFrom, dateTo);
        setFilteredLogs(filtered);
        toast.success(`Found ${filtered.length} matching lines`);
      } catch (err : any) {
        toast.error("Filter error: " + err.message);
      }
    },

    handleClear: () => {
      setLogContent("");
      setFilteredLogs([]);
      setSearchQuery("");
      setLogLevel("all");
      setFileName("");
      setUseRegex(false);
      setCaseSensitive(false);
      setDateFrom("");
      setDateTo("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      logContent,
      filteredLogs,
      searchQuery,
      logLevel,
      fileName,
      useRegex,
      caseSensitive,
      dateFrom,
      dateTo,
      fileInputRef,
    },
    setters: {
      setLogContent,
      setFilteredLogs,
      setSearchQuery,
      setLogLevel,
      setFileName,
      setUseRegex,
      setCaseSensitive,
      setDateFrom,
      setDateTo,
    },
    helpers,
    actions,
  };
};
