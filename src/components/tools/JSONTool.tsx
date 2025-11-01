import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wand2,
  Minimize2,
  CheckCircle2,
  GitBranch,
  Copy,
  Trash2,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JSONPath {
  path: string;
  type: string;
  value: any;
}

export const JSONTool = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [paths, setPaths] = useState<JSONPath[]>([]);
  const [jsonPathQuery, setJsonPathQuery] = useState("");
  const [error, setError] = useState("");
  const [isDestructured, setIsDestructured] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handlePrettify();
      }
      if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input]);

  const parseJSON = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      // Try parsing as newline-delimited JSON
      const lines = text.trim().split("\n");
      const parsed = lines.map((line) => JSON.parse(line.trim()));
      return parsed.length === 1 ? parsed[0] : parsed;
    }
  };

  const handlePrettify = () => {
    try {
      setError("");
      const parsed = parseJSON(input);
      const prettified = JSON.stringify(parsed, null, 2);
      setOutput(prettified);
      setIsDestructured(false);
      toast.success("JSON prettified!");
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
      toast.error("Invalid JSON format");
    }
  };

  const handleMinify = () => {
    try {
      setError("");
      const parsed = parseJSON(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setIsDestructured(false);
      toast.success("JSON minified!");
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
      toast.error("Invalid JSON format");
    }
  };

  const handleValidate = () => {
    try {
      setError("");
      parseJSON(input);
      toast.success("✓ Valid JSON", {
        description: "Your JSON is properly formatted",
      });
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
      toast.error("Invalid JSON");
    }
  };

  const extractPaths = (obj: any, prefix = ""): JSONPath[] => {
    const paths: JSONPath[] = [];

    const traverse = (current: any, path: string) => {
      if (current === null || current === undefined) {
        paths.push({ path, type: "null", value: current });
      } else if (Array.isArray(current)) {
        paths.push({ path, type: "array", value: `Array(${current.length})` });
        current.forEach((item, index) => {
          traverse(item, `${path}[${index}]`);
        });
      } else if (typeof current === "object") {
        paths.push({ path, type: "object", value: "Object" });
        Object.entries(current).forEach(([key, value]) => {
          traverse(value, path ? `${path}.${key}` : key);
        });
      } else {
        paths.push({
          path,
          type: typeof current,
          value: current,
        });
      }
    };

    traverse(obj, prefix);
    return paths;
  };

  const handleDestructure = () => {
    try {
      setError("");
      const parsed = parseJSON(input);
      const extractedPaths = extractPaths(parsed);
      setPaths(extractedPaths);
      setIsDestructured(true);
      toast.success(`Extracted ${extractedPaths.length} paths`);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
      toast.error("Invalid JSON format");
    }
  };

  const handleCopy = (text: string, label = "Output") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setPaths([]);
    setError("");
    setIsDestructured(false);
    setJsonPathQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePrettify} className="btn-gradient">
          <Wand2 className="w-4 h-4 mr-2" />
          Prettify
        </Button>
        <Button onClick={handleMinify} variant="outline">
          <Minimize2 className="w-4 h-4 mr-2" />
          Minify
        </Button>
        <Button onClick={handleValidate} variant="outline">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Validate
        </Button>
        <Button onClick={handleDestructure} variant="outline">
          <GitBranch className="w-4 h-4 mr-2" />
          Destructure
        </Button>
        <Button onClick={() => handleCopy(output)} variant="outline" disabled={!output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button onClick={handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Pane */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Input JSON</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            className="code-editor min-h-[400px]"
          />
          <p className="text-xs text-muted-foreground">
            Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> to prettify
          </p>
        </div>

        {/* Output Pane */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {isDestructured ? "JSON Paths" : "Output"}
          </Label>
          {isDestructured ? (
            <div className="bg-input border border-border rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {paths.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start justify-between p-3 bg-card/50 rounded-lg hover:bg-card transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-primary break-all">{item.path}</code>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.type}
                        </span>
                        {item.type !== "object" && item.type !== "array" && (
                          <span className="text-xs text-foreground/70">
                            = {String(item.value)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(item.path, "Path")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Formatted JSON will appear here..."
              className="code-editor min-h-[400px]"
            />
          )}
        </div>
      </div>

      {/* JSONPath Query (Advanced) */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-sm font-medium">JSONPath Query (Optional)</Label>
        <div className="flex gap-2">
          <Input
            value={jsonPathQuery}
            onChange={(e) => setJsonPathQuery(e.target.value)}
            placeholder="e.g., $.users[*].email"
            className="flex-1"
          />
          <Button variant="outline">
            <Code2 className="w-4 h-4 mr-2" />
            Execute
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Advanced: Use JSONPath syntax to query and extract specific data
        </p>
      </div>
    </div>
  );
};
