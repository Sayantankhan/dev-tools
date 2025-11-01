import { useState, useRef } from "react";
import { toast } from "sonner";
import { ToolHandler } from "@/modules/types/ToolHandler";

export const Base64EnStateHandler = (): ToolHandler => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [urlSafe, setUrlSafe] = useState(false);
    const [isEncoded, setIsEncoded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const helpers = {
        isBase64: (str: string): boolean => {
            try {
                const base64Regex = /^[A-Za-z0-9+/=]+$/;
                return base64Regex.test(str.trim()) && str.length % 4 === 0;
            } catch {
                return false;
            }
        },

        isImagePreview: () => isEncoded && output && output.length > 100,
    }

    const actions = {
        handleEncode: () => {
            try {
                let encoded = btoa(input);

                if (urlSafe) {
                    encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                }

                setOutput(encoded);
                setIsEncoded(true);
                toast.success("Text encoded to Base64!");
            } catch (error: any) {
                toast.error("Encoding failed", {
                    description: error.message,
                });
            }
        },

        handleDecode: () => {
            try {
                let toDecode = input.trim();

                // Handle URL-safe base64
                if (urlSafe || toDecode.includes("-") || toDecode.includes("_")) {
                    toDecode = toDecode.replace(/-/g, "+").replace(/_/g, "/");
                    const pad = toDecode.length % 4;
                    if (pad) {
                        toDecode += "=".repeat(4 - pad);
                    }
                }

                const decoded = atob(toDecode);
                setOutput(decoded);
                setIsEncoded(false);
                toast.success("Base64 decoded successfully!");
            } catch (error: any) {
                toast.error("Decoding failed", {
                    description: "Invalid Base64 string",
                });
            }
        },

        handleFileEncode: (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                const base64Data = base64.split(",")[1];
                setOutput(base64Data);
                setIsEncoded(true);
                toast.success("File encoded to Base64!");
            };
            reader.readAsDataURL(file);
        },

        handleAutoDetect: () => {
            if (helpers.isBase64(input)) {
                actions.handleDecode();
                toast.success("Auto-detected Base64, decoded successfully!");
            } else {
                actions.handleEncode();
                toast.success("Auto-detected text, encoded successfully!");
            }
        },

        handleCopy: () => {
            navigator.clipboard.writeText(output);
            toast.success("Output copied to clipboard!");
        },

        handleDownload: () => {
            if (!output) return;

            try {
                // Try to decode as binary file
                const binary = atob(output);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([bytes]);
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = `decoded-file-${Date.now()}`;
                a.click();

                URL.revokeObjectURL(url);
                toast.success("File downloaded!");
            } catch (error) {
                // If it fails, just download as text
                const blob = new Blob([output], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `output-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Text file downloaded!");
            }
        },

        handleClear: () => {
            setInput("");
            setOutput("");
            setIsEncoded(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
    }

    return {
        state: {},
        setters: {},
        helpers,
        actions
    }
}