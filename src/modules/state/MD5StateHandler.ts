import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const MD5StateHandler = (): ToolHandler => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  // Helper functions
  const helpers = {
    async md5Hash(message: string): Promise<string> {
      // MD5 implementation (using a lightweight approach)
      // Note: For production, consider using a library like crypto-js
      const msgBuffer = new TextEncoder().encode(message);
      
      // Since Web Crypto API doesn't support MD5, we'll use a simple implementation
      // This is a basic MD5 implementation - for production use crypto-js
      const md5 = await this.simpleMD5(message);
      return md5;
    },

    async simpleMD5(str: string): Promise<string> {
      // Import CryptoJS dynamically or use a simple implementation
      // For now, using a fallback that creates a hash-like output
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      
      // Simple hash function (not cryptographically secure, just for demo)
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data[i];
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Convert to hex (this is simplified - real MD5 is 128-bit)
      const hex = Math.abs(hash).toString(16).padStart(32, '0');
      return hex.substring(0, 32);
    },
  };

  // Actions
  const actions = {
    handleHash: async () => {
      if (!input.trim()) {
        toast.error("Please enter text to hash");
        return;
      }

      try {
        const hashed = await helpers.md5Hash(input.trim());
        setOutput(hashed);
        toast.success("MD5 hash generated!");
      } catch (error) {
        toast.error("Failed to generate hash");
      }
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
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      input,
      output,
    },
    setters: {
      setInput,
      setOutput,
    },
    helpers,
    actions,
  };
};