import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const RandomGeneratorStateHandler = (): ToolHandler => {
  const [output, setOutput] = useState("");
  const [format, setFormat] = useState<"json" | "xml" | "yaml" | "uuid">("json");
  const [complexity, setComplexity] = useState(3);

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

    generateUUID: (): string => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
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
          case "uuid":
            result = helpers.generateUUID();
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
