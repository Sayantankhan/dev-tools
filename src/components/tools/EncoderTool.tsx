import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, Copy, Download, Trash2, Hash } from "lucide-react";
import { Base64EnStateHandler } from "@/modules/state/Base64EnStateHandler";
import { URLStateHandler } from "@/modules/state/URLStateHandler";
import { SHA256StateHandler } from "@/modules/state/SHA256StateHandler";

type EncodingType = "base64" | "url" | "sha256";

export const EncoderTool = () => {
  const [encodingType, setEncodingType] = useState<EncodingType>("base64");
  
  const base64Handler = Base64EnStateHandler();
  const urlHandler = URLStateHandler();
  const sha256Handler = SHA256StateHandler();

  // Clear input/output when encoding type changes
  const handleEncodingTypeChange = (value: EncodingType) => {
    base64Handler.actions.handleClear();
    urlHandler.actions.handleClear();
    sha256Handler.actions.handleClear();
    setEncodingType(value);
  };

  // Get current handler based on encoding type
  const getCurrentHandler = () => {
    switch (encodingType) {
      case "base64":
        return base64Handler;
      case "url":
        return urlHandler;
      case "sha256":
        return sha256Handler;
    }
  };

  const handler = getCurrentHandler();
  const showDecode = encodingType !== "sha256";

  return (
    <div className="space-y-6">
      {/* Encoding Type Selector */}
      <div className="flex items-center gap-4">
        <Label>Encoding Type:</Label>
        <Select value={encodingType} onValueChange={handleEncodingTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base64">Base64</SelectItem>
            <SelectItem value="url">URL</SelectItem>
            <SelectItem value="sha256">SHA-256 Hash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {encodingType === "base64" && (
          <>
            <Button onClick={base64Handler.actions.handleEncode} className="btn-gradient">
              <Lock className="w-4 h-4 mr-2" />
              Encode
            </Button>
            <Button onClick={base64Handler.actions.handleDecode} variant="outline">
              <Unlock className="w-4 h-4 mr-2" />
              Decode
            </Button>
            <Button onClick={base64Handler.actions.handleAutoDetect} variant="outline">
              Auto-detect
            </Button>
          </>
        )}
        
        {encodingType === "url" && (
          <>
            <Button onClick={urlHandler.actions.handleEncode} className="btn-gradient">
              <Lock className="w-4 h-4 mr-2" />
              Encode
            </Button>
            <Button onClick={urlHandler.actions.handleDecode} variant="outline">
              <Unlock className="w-4 h-4 mr-2" />
              Decode
            </Button>
            <Button onClick={urlHandler.actions.handleParse} variant="outline">
              Parse URL
            </Button>
          </>
        )}
        
        {encodingType === "sha256" && (
          <Button onClick={sha256Handler.actions.handleHash} className="btn-gradient">
            <Hash className="w-4 h-4 mr-2" />
            Generate Hash
          </Button>
        )}

        <Button onClick={handler.actions.handleCopy} variant="outline" disabled={!handler.state.output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>

        {encodingType === "base64" && (
          <Button onClick={base64Handler.actions.handleDownload} variant="outline" disabled={!base64Handler.state.output}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}

        <Button onClick={handler.actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Input/Output */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <Label>Input</Label>
          <Textarea
            value={handler.state.input}
            onChange={(e) => handler.setters.setInput(e.target.value)}
            placeholder={
              encodingType === "base64" 
                ? "Enter text or paste Base64 here..." 
                : encodingType === "url"
                ? "Enter URL to encode/decode/parse..."
                : "Enter text to hash..."
            }
            className="code-editor min-h-[400px]"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <Label>Output</Label>
          {encodingType === "base64" && base64Handler.state.isImagePreview && base64Handler.state.output.startsWith("/9j/") ? (
            <div className="bg-input border border-border rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <img
                src={`data:image/jpeg;base64,${base64Handler.state.output}`}
                alt="Preview"
                className="max-w-full max-h-[380px] object-contain"
                onError={() => {
                  base64Handler.setters.setIsEncoded(false);
                }}
              />
            </div>
          ) : (
            <Textarea
              value={handler.state.output}
              readOnly
              placeholder="Result will appear here..."
              className="code-editor min-h-[400px]"
            />
          )}
        </div>
      </div>

      {/* Parsed URL Data */}
      {encodingType === "url" && urlHandler.state.parsedData && (
        <div className="p-4 bg-card/50 rounded-lg border border-border space-y-3">
          <h3 className="font-semibold text-lg">Parsed URL Components</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Protocol:</span>
              <span className="ml-2 font-mono">{urlHandler.state.parsedData.protocol}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Hostname:</span>
              <span className="ml-2 font-mono">{urlHandler.state.parsedData.hostname}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Port:</span>
              <span className="ml-2 font-mono">{urlHandler.state.parsedData.port}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pathname:</span>
              <span className="ml-2 font-mono">{urlHandler.state.parsedData.pathname}</span>
            </div>
            {urlHandler.state.parsedData.search && (
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Query String:</span>
                <span className="ml-2 font-mono">{urlHandler.state.parsedData.search}</span>
              </div>
            )}
            {urlHandler.state.parsedData.hash && (
              <div>
                <span className="text-muted-foreground">Hash:</span>
                <span className="ml-2 font-mono">{urlHandler.state.parsedData.hash}</span>
              </div>
            )}
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Origin:</span>
              <span className="ml-2 font-mono">{urlHandler.state.parsedData.origin}</span>
            </div>
          </div>

          {urlHandler.state.parsedData.parameters && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Query Parameters</h4>
              <div className="space-y-2">
                {Object.entries(urlHandler.state.parsedData.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                    <span className="font-mono break-all">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      {handler.state.output && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>
            Output length: {handler.state.output.length} characters
            {encodingType === "base64" && base64Handler.helpers.isImagePreview && " • Image preview available"}
            {encodingType === "sha256" && " • SHA-256 is a one-way hash (cannot be decoded)"}
          </p>
        </div>
      )}
    </div>
  );
};
