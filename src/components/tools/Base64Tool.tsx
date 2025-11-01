import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Lock, Unlock, Copy, Download, Upload, Trash2 } from "lucide-react";

export const Base64Tool = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [isEncoded, setIsEncoded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBase64 = (str: string): boolean => {
    try {
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      return base64Regex.test(str.trim()) && str.length % 4 === 0;
    } catch {
      return false;
    }
  };

  const handleEncode = () => {
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
  };

  const handleDecode = () => {
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
  };

  const handleFileEncode = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleAutoDetect = () => {
    if (isBase64(input)) {
      handleDecode();
      toast.success("Auto-detected Base64, decoded successfully!");
    } else {
      handleEncode();
      toast.success("Auto-detected text, encoded successfully!");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    toast.success("Output copied to clipboard!");
  };

  const handleDownload = () => {
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
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setIsEncoded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check if output is an image
  const isImagePreview = isEncoded && output && output.length > 100;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleEncode} className="btn-gradient">
          <Lock className="w-4 h-4 mr-2" />
          Encode
        </Button>
        <Button onClick={handleDecode} variant="outline">
          <Unlock className="w-4 h-4 mr-2" />
          Decode
        </Button>
        <Button onClick={handleAutoDetect} variant="outline">
          Auto-detect
        </Button>
        <Button onClick={handleCopy} variant="outline" disabled={!output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button onClick={handleDownload} variant="outline" disabled={!output}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="url-safe"
            checked={urlSafe}
            onCheckedChange={(checked) => setUrlSafe(checked as boolean)}
          />
          <Label htmlFor="url-safe" className="cursor-pointer">
            URL-safe Base64
          </Label>
        </div>

        <div className="flex items-center">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileEncode}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Encode File
          </Button>
        </div>
      </div>

      {/* Input/Output */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <Label>Input</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text or paste Base64 here..."
            className="code-editor min-h-[400px]"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <Label>Output</Label>
          {isImagePreview && output.startsWith("/9j/") ? (
            <div className="bg-input border border-border rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <img
                src={`data:image/jpeg;base64,${output}`}
                alt="Preview"
                className="max-w-full max-h-[380px] object-contain"
                onError={() => {
                  // Fallback to text if image fails
                  setIsEncoded(false);
                }}
              />
            </div>
          ) : (
            <Textarea
              value={output}
              readOnly
              placeholder="Result will appear here..."
              className="code-editor min-h-[400px]"
            />
          )}
        </div>
      </div>

      {/* Info */}
      {output && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>
            Output length: {output.length} characters
            {isImagePreview && " • Image preview available"}
          </p>
        </div>
      )}
    </div>
  );
};
