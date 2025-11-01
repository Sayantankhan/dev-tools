import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ToolHandler } from "@/modules/types/ToolHandler";

interface JSONPath {
    path: string;
    type: string;
    value: any;
}

export const JSONStateHandler = (): ToolHandler => {
    // --- STATE ---
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [paths, setPaths] = useState<JSONPath[]>([]);
    const [jsonPathQuery, setJsonPathQuery] = useState("");
    const [jsonPathParseOp, setJsonPathParseOp] = useState("");
    const [error, setError] = useState("");
    const [isDestructured, setIsDestructured] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                actions.handlePrettify();
            }
            if (e.key === "Escape") {
                actions.handleClear();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [input]);

    // --- HELPERS ---
    const helpers = {
        parseJSON: (text: string) => {
            try {
                return JSON.parse(text);
            } catch {
                // Try parsing as newline-delimited JSON
                const lines = text.trim().split("\n");
                const parsed = lines.map((line) => JSON.parse(line.trim()));
                return parsed.length === 1 ? parsed[0] : parsed;
            }
        },

        extractPaths: (obj: any, prefix = ""): JSONPath[] => {
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
        },
    }

    // --- ACTIONS ---
    const actions = {
        handleJsonPathParsing: async () => {
            try {
                setError("");

                if (!input.trim()) {
                    setError("No JSON input provided");
                    toast.error("Please provide JSON input first");
                    return;
                }

                const query = jsonPathQuery.trim();
                if (!query) {
                    return;
                }

                let parsed: any;
                try {
                    parsed = helpers.parseJSON(input);
                } catch (err: any) {
                    setError(`Invalid JSON: ${err.message}`);
                    toast.error("Invalid JSON");
                    return;
                }

                let mod: any;
                mod = await import("jsonpath-plus");
                const JSONPath = mod.JSONPath ?? mod.jsonPath;
                const results = JSONPath({ path: query, json: parsed });

                if (!results || results.length === 0) {
                    setJsonPathParseOp("No results found");
                    toast("No matches found");
                    return;
                }

                // ✅ If it's a single primitive value, just display it as-is
                let finalOutput: any;
                if (results.length === 1) {
                    const single = results[0];
                    if (typeof single === "object" && single !== null) {
                        finalOutput = JSON.stringify(single, null, 2);
                    } else {
                        finalOutput = String(single);
                    }
                } else {
                    // If it's an array, join primitives line-by-line for readability
                    const allPrimitive = results.every(
                        (r) => typeof r !== "object" || r === null
                    );
                    if (allPrimitive) {
                        finalOutput = results.map((r) => String(r)).join("\n");
                    } else {
                        finalOutput = JSON.stringify(results, null, 2);
                    }
                }

                setJsonPathParseOp(finalOutput);
                toast.success("JSONPath executed");

            } catch (err: any) {
                setError(`Invalid JSON Query String: ${err.message}`);
                toast.error("Invalid JSON Query String");
            }
        },

        handlePrettify: () => {
            try {
                setError("");
                const parsed = helpers.parseJSON(input);
                const prettified = JSON.stringify(parsed, null, 2);
                setOutput(prettified);
                setIsDestructured(false);
                toast.success("JSON prettified!");
            } catch (err: any) {
                setError(`Invalid JSON: ${err.message}`);
                toast.error("Invalid JSON format");
            }
        },

        handleMinify: () => {
            try {
                setError("");
                const parsed = helpers.parseJSON(input);
                const minified = JSON.stringify(parsed);
                setOutput(minified);
                setIsDestructured(false);
                toast.success("JSON minified!");
            } catch (err: any) {
                setError(`Invalid JSON: ${err.message}`);
                toast.error("Invalid JSON format");
            }
        },

        handleValidate: () => {
            try {
                setError("");
                helpers.parseJSON(input);
                toast.success("✓ Valid JSON", {
                    description: "Your JSON is properly formatted",
                });
            } catch (err: any) {
                setError(`Invalid JSON: ${err.message}`);
                toast.error("Invalid JSON");
            }
        },

        handleDestructure: () => {
            try {
                setError("");
                const parsed = helpers.parseJSON(input);
                const extractedPaths = helpers.extractPaths(parsed);
                setPaths(extractedPaths);
                setIsDestructured(true);
                toast.success(`Extracted ${extractedPaths.length} paths`);
            } catch (err: any) {
                setError(`Invalid JSON: ${err.message}`);
                toast.error("Invalid JSON format");
            }
        },

        handleCopy: (text: string, label = "Output") => {
            navigator.clipboard.writeText(text);
            toast.success(`${label} copied to clipboard!`);
        },

        handleClear: () => {
            setInput("");
            setOutput("");
            setPaths([]);
            setError("");
            setIsDestructured(false);
            setJsonPathQuery("");
            setJsonPathParseOp("");
        }
    }


    return {
        state: {
            input,
            output,
            paths,
            jsonPathQuery,
            jsonPathParseOp,
            error,
            isDestructured
        },
        setters: {
            setInput,
            setJsonPathQuery
        },
        helpers,
        actions
    };
}