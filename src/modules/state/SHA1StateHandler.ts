import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const SHA1StateHandler = (): ToolHandler => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  // Helper functions
  const helpers = {
    async sha1Hash(message: string): Promise<string> {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
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
        const hashed = await helpers.sha1Hash(input.trim());
        setOutput(hashed);
        toast.success("SHA-1 hash generated!");
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