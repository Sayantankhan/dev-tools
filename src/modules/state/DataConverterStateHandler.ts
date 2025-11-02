import { useState } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import Papa from "papaparse";

export const DataConverterStateHandler = (): ToolHandler => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fromFormat, setFromFormat] = useState<"json" | "xml" | "yaml" | "csv">("json");
  const [toFormat, setToFormat] = useState<"json" | "xml" | "yaml" | "csv">("xml");

  const helpers = {
    parseXML: (xmlString: string): any => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      const parseNode = (node: any): any => {
        if (node.nodeType === 3) return node.nodeValue;

        const obj: any = {};
        if (node.attributes?.length > 0) {
          obj["@attributes"] = {};
          for (let i = 0; i < node.attributes.length; i++) {
            obj["@attributes"][node.attributes[i].name] = node.attributes[i].value;
          }
        }

        if (node.childNodes?.length > 0) {
          for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            const childName = child.nodeName;

            if (child.nodeType === 3 && child.nodeValue?.trim()) {
              return child.nodeValue;
            }

            if (childName !== "#text") {
              if (!obj[childName]) {
                obj[childName] = parseNode(child);
              } else {
                if (!Array.isArray(obj[childName])) {
                  obj[childName] = [obj[childName]];
                }
                obj[childName].push(parseNode(child));
              }
            }
          }
        }

        return obj;
      };

      return parseNode(xmlDoc.documentElement);
    },

    jsonToXML: (obj: any, rootName: string = "root"): string => {
      const convert = (data: any, name: string): string => {
        if (typeof data === "object" && !Array.isArray(data)) {
          const inner = Object.entries(data)
            .map(([k, v]) => convert(v, k))
            .join("\n  ");
          return `<${name}>\n  ${inner}\n</${name}>`;
        } else if (Array.isArray(data)) {
          return data.map((item, idx) => convert(item, `item_${idx}`)).join("\n");
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
              if (typeof v === "object" && v !== null) {
                return `${spaces}${k}:\n${convert(v, indent + 1)}`;
              }
              return `${spaces}${k}: ${v}`;
            })
            .join("\n");
        } else if (Array.isArray(data)) {
          return data.map((item) => `${spaces}- ${typeof item === "object" ? "\n" + convert(item, indent + 1) : item}`).join("\n");
        } else {
          return `${spaces}${data}`;
        }
      };
      return convert(obj);
    },

    yamlToJSON: (yamlString: string): any => {
      const lines = yamlString.split("\n");
      const result: any = {};
      const stack: any[] = [{ indent: -1, obj: result }];

      lines.forEach((line) => {
        const match = line.match(/^(\s*)(.+?):\s*(.*)$/);
        if (!match) return;

        const indent = match[1].length;
        const key = match[2];
        const value = match[3];

        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }

        const parent = stack[stack.length - 1].obj;
        if (value) {
          parent[key] = isNaN(Number(value)) ? value : Number(value);
        } else {
          parent[key] = {};
          stack.push({ indent, obj: parent[key] });
        }
      });

      return result;
    },

    jsonToCSV: (data: any): string => {
      const arr = Array.isArray(data) ? data : [data];
      return Papa.unparse(arr);
    },

    csvToJSON: (csv: string): any => {
      const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
      return result.data;
    },
  };

  const actions = {
    handleConvert: () => {
      if (!input.trim()) {
        toast.error("Please enter data to convert");
        return;
      }

      try {
        let intermediateData: any;

        // Parse from source format
        switch (fromFormat) {
          case "json":
            intermediateData = JSON.parse(input);
            break;
          case "xml":
            intermediateData = helpers.parseXML(input);
            break;
          case "yaml":
            intermediateData = helpers.yamlToJSON(input);
            break;
          case "csv":
            intermediateData = helpers.csvToJSON(input);
            break;
        }

        // Convert to target format
        let result = "";
        switch (toFormat) {
          case "json":
            result = JSON.stringify(intermediateData, null, 2);
            break;
          case "xml":
            result = helpers.jsonToXML(intermediateData);
            break;
          case "yaml":
            result = helpers.jsonToYAML(intermediateData);
            break;
          case "csv":
            result = helpers.jsonToCSV(intermediateData);
            break;
        }

        setOutput(result);
        toast.success(`Converted ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()}`);
      } catch (error: any) {
        toast.error(`Conversion failed: ${error.message}`);
      }
    },

    handleSwap: () => {
      const temp = fromFormat;
      setFromFormat(toFormat);
      setToFormat(temp);
      toast.success("Formats swapped!");
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
      setInput("");
      setOutput("");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      input,
      output,
      fromFormat,
      toFormat,
    },
    setters: {
      setInput,
      setOutput,
      setFromFormat,
      setToFormat,
    },
    helpers,
    actions,
  };
};
