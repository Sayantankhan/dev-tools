import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const URLStateHandler = (): ToolHandler => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [parsedData, setParsedData] = useState<Record<string, any> | null>(null);

  // Helper functions
  const helpers = {
    isValidURL: (str: string): boolean => {
      try {
        new URL(str);
        return true;
      } catch {
        return false;
      }
    },

    parseURL: (urlString: string): Record<string, any> | null => {
      try {
        const url = new URL(urlString);
        const params: Record<string, string> = {};
        
        url.searchParams.forEach((value, key) => {
          params[key] = value;
        });

        return {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || "(default)",
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
          origin: url.origin,
          parameters: Object.keys(params).length > 0 ? params : null,
        };
      } catch (error) {
        return null;
      }
    },
  };

  // Actions
  const actions = {
    handleEncode: () => {
      if (!input.trim()) {
        toast.error("Please enter a URL to encode");
        return;
      }

      try {
        const encoded = encodeURIComponent(input.trim());
        setOutput(encoded);
        setParsedData(null);
        toast.success("URL encoded successfully!");
      } catch (error) {
        toast.error("Failed to encode URL");
      }
    },

    handleDecode: () => {
      if (!input.trim()) {
        toast.error("Please enter an encoded URL to decode");
        return;
      }

      try {
        const decoded = decodeURIComponent(input.trim());
        setOutput(decoded);
        setParsedData(null);
        toast.success("URL decoded successfully!");
      } catch (error) {
        toast.error("Failed to decode URL - invalid format");
      }
    },

    handleParse: () => {
      if (!input.trim()) {
        toast.error("Please enter a URL to parse");
        return;
      }

      const parsed = helpers.parseURL(input.trim());
      
      if (!parsed) {
        toast.error("Invalid URL format");
        return;
      }

      setParsedData(parsed);
      setOutput(JSON.stringify(parsed, null, 2));
      toast.success("URL parsed successfully!");
    },

    handleCopy: async () => {
      if (!output) {
        toast.error("Nothing to copy");
        return;
      }

      try {
        await navigator.clipboard.writeText(output);
        toast.success("Copied to clipboard!");
      } catch (error) {
        toast.error("Failed to copy to clipboard");
      }
    },

    handleClear: () => {
      setInput("");
      setOutput("");
      setParsedData(null);
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      input,
      output,
      parsedData,
    },
    setters: {
      setInput,
      setOutput,
      setParsedData,
    },
    helpers,
    actions,
  };
};
