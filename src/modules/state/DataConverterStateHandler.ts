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
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format");
      }

      const parseNode = (node: any): any => {
        if (node.nodeType === 3) {
          const value = node.nodeValue?.trim();
          return value || null;
        }

        const obj: any = {};
        
        // Handle attributes
        if (node.attributes?.length > 0) {
          obj["@attributes"] = {};
          for (let i = 0; i < node.attributes.length; i++) {
            obj["@attributes"][node.attributes[i].name] = node.attributes[i].value;
          }
        }

        // Handle child nodes
        let textContent = "";
        const childElements: any = {};
        
        if (node.childNodes?.length > 0) {
          for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            
            // Text node
            if (child.nodeType === 3) {
              const text = child.nodeValue?.trim();
              if (text) textContent += text;
              continue;
            }
            
            // Element node
            if (child.nodeType === 1) {
              const childName = child.nodeName;
              const childValue = parseNode(child);
              
              if (!childElements[childName]) {
                childElements[childName] = childValue;
              } else {
                if (!Array.isArray(childElements[childName])) {
                  childElements[childName] = [childElements[childName]];
                }
                childElements[childName].push(childValue);
              }
            }
          }
        }

        // If node has only text content and no child elements, return text
        if (textContent && Object.keys(childElements).length === 0 && !obj["@attributes"]) {
          return textContent;
        }
        
        // If node has only text and attributes
        if (textContent && Object.keys(childElements).length === 0 && obj["@attributes"]) {
          obj["#text"] = textContent;
          return obj;
        }
        
        // Merge child elements into obj
        Object.assign(obj, childElements);
        
        // Return simple value if no attributes and single text child
        if (Object.keys(obj).length === 0) {
          return textContent || null;
        }

        return obj;
      };

      const root = xmlDoc.documentElement;
      const result: any = {};
      result[root.nodeName] = parseNode(root);
      return result;
    },

    jsonToXML: (obj: any, rootName: string = "root"): string => {
      const convert = (data: any, name: string, indent: number = 0): string => {
        const spaces = "  ".repeat(indent);
        const innerSpaces = "  ".repeat(indent + 1);
        
        if (data === null || data === undefined) {
          return `${spaces}<${name}/>`;
        }
        
        if (typeof data === "object" && !Array.isArray(data)) {
          // Handle attributes if present
          if (data["@attributes"]) {
            const attrs = Object.entries(data["@attributes"])
              .map(([k, v]) => `${k}="${v}"`)
              .join(" ");
            const rest = { ...data };
            delete rest["@attributes"];
            const hasContent = Object.keys(rest).length > 0;
            
            if (!hasContent) {
              return `${spaces}<${name} ${attrs}/>`;
            }
            
            const inner = Object.entries(rest)
              .map(([k, v]) => convert(v, k, indent + 1))
              .join("\n");
            return `${spaces}<${name} ${attrs}>\n${inner}\n${spaces}</${name}>`;
          }
          
          const entries = Object.entries(data);
          if (entries.length === 0) {
            return `${spaces}<${name}/>`;
          }
          
          const inner = entries
            .map(([k, v]) => convert(v, k, indent + 1))
            .join("\n");
          return `${spaces}<${name}>\n${inner}\n${spaces}</${name}>`;
        } else if (Array.isArray(data)) {
          return data
            .map((item) => convert(item, name, indent))
            .join("\n");
        } else {
          // Escape XML special characters
          const escaped = String(data)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
          return `${spaces}<${name}>${escaped}</${name}>`;
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
