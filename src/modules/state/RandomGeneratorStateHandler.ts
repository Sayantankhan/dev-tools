import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const RandomGeneratorStateHandler = (): ToolHandler => {
  const [output, setOutput] = useState("");
  const [format, setFormat] = useState<"json" | "xml" | "yaml" | "uuid-v4" | "uuid-v7">("json");
  const [complexity, setComplexity] = useState(3);
  const [count, setCount] = useState(1);

  const helpers = {
    generateRandomString: (length: number = 8): string => {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    },

    generateRandomValue: (): any => {
      const types = ["string", "number", "boolean"];
      const type = types[Math.floor(Math.random() * types.length)];

      switch (type) {
        case "string":
          return helpers.generateRandomString(8);
        case "number":
          return Math.floor(Math.random() * 1000);
        case "boolean":
          return Math.random() > 0.5;
      }
    },

    generateRandomJSON: (depth: number): any => {
      if (depth <= 0) return helpers.generateRandomValue();

      const obj: any = {};
      const numKeys = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numKeys; i++) {
        const key = helpers.generateRandomString(6);
        const shouldNest = Math.random() > 0.6 && depth > 1;
        obj[key] = shouldNest ? helpers.generateRandomJSON(depth - 1) : helpers.generateRandomValue();
      }

      return obj;
    },

    generateUUIDv4: (): string => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },

    generateUUIDv7: (): string => {
      // UUID v7: 48-bit unix ms timestamp + version + random
      const ts = Date.now();
      const tsHex = ts.toString(16).padStart(12, "0");
      const rand = new Uint8Array(10);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(rand);
      } else {
        for (let i = 0; i < 10; i++) rand[i] = Math.floor(Math.random() * 256);
      }
      // Set version (7) in byte 6
      rand[0] = (rand[0] & 0x0f) | 0x70;
      // Set variant (10xx) in byte 8
      rand[2] = (rand[2] & 0x3f) | 0x80;
      const hex = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${tsHex.slice(0, 8)}-${tsHex.slice(8, 12)}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 20)}`;
    },

    jsonToXML: (obj: any, rootName: string = "root"): string => {
      const convert = (data: any, name: string): string => {
        if (typeof data === "object" && !Array.isArray(data)) {
          const inner = Object.entries(data)
            .map(([k, v]) => convert(v, k))
            .join("\n  ");
          return `<${name}>\n  ${inner}\n</${name}>`;
        } else if (Array.isArray(data)) {
          return data.map((item) => convert(item, "item")).join("\n");
        } else {
          return `<${name}>${data}</${name}>`;
        }
      };
      return `<?xml version="1.0" encoding="UTF-8"?>\n${convert(obj, rootName)}`;
    },

    jsonToYAML: (obj: any): string => {
      const convert = (data: any, indent: number = 0): string => {
        const spaces = "  ".repeat(indent);
        if (typeof data === "object" && !Array.isArray(data)) {
          return Object.entries(data)
            .map(([k, v]) => {
              if (typeof v === "object") {
                return `${spaces}${k}:\n${convert(v, indent + 1)}`;
              }
              return `${spaces}${k}: ${v}`;
            })
            .join("\n");
        } else if (Array.isArray(data)) {
          return data.map((item) => `${spaces}- ${item}`).join("\n");
        } else {
          return `${spaces}${data}`;
        }
      };
      return convert(obj);
    },
  };

  const actions = {
    handleGenerate: () => {
      try {
        let result = "";

        switch (format) {
          case "uuid-v4":
            result = Array.from({ length: Math.max(1, count) }, () => helpers.generateUUIDv4()).join("\n");
            break;

          case "uuid-v7":
            result = Array.from({ length: Math.max(1, count) }, () => helpers.generateUUIDv7()).join("\n");
            break;

          case "json": {
            const jsonData = helpers.generateRandomJSON(complexity);
            result = JSON.stringify(jsonData, null, 2);
            break;
          }

          case "xml": {
            const jsonData = helpers.generateRandomJSON(complexity);
            result = helpers.jsonToXML(jsonData);
            break;
          }

          case "yaml": {
            const jsonData = helpers.generateRandomJSON(complexity);
            result = helpers.jsonToYAML(jsonData);
            break;
          }
        }

        setOutput(result);
        toast.success(`Generated random ${format.toUpperCase()}`);
      } catch (error) {
        toast.error("Failed to generate data");
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
        toast.error("Failed to copy");
      }
    },

    handleClear: () => {
      setOutput("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      output,
      format,
      complexity,
    },
    setters: {
      setOutput,
      setFormat,
      setComplexity,
    },
    helpers,
    actions,
  };
};
