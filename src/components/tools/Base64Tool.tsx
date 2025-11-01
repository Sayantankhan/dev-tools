import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Lock, Unlock, Copy, Download, Upload, Trash2 } from "lucide-react";
import { Base64EnStateHandler } from "@/modules/state/Base64EnStateHandler";

export const Base64Tool = () => {
  const {
        state,
        setters,
        helpers,
        actions
      } = Base64EnStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={actions.handleEncode} className="btn-gradient">
          <Lock className="w-4 h-4 mr-2" />
          Encode
        </Button>
        <Button onClick={actions.handleDecode} variant="outline">
          <Unlock className="w-4 h-4 mr-2" />
          Decode
        </Button>
        <Button onClick={actions.handleAutoDetect} variant="outline">
          Auto-detect
        </Button>
        <Button onClick={actions.handleCopy} variant="outline" disabled={!state.output}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </Button>
        <Button onClick={actions.handleDownload} variant="outline" disabled={!state.output}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="url-safe"
            checked={state.urlSafe}
            onCheckedChange={(checked) => setters.setUrlSafe(checked as boolean)}
          />
          <Label htmlFor="url-safe" className="cursor-pointer">
            URL-safe Base64
          </Label>
        </div>

        <div className="flex items-center">
          <input
            ref={state.fileInputRef}
            type="file"
            onChange={actions.handleFileEncode}
            className="hidden"
          />
          <Button
            onClick={() => state.fileInputRef.current?.click()}
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
            value={state.input}
            onChange={(e) => setters.setInput(e.target.value)}
            placeholder="Enter text or paste Base64 here..."
            className="code-editor min-h-[400px]"
          />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <Label>Output</Label>
          {state.isImagePreview && state.output.startsWith("/9j/") ? (
            <div className="bg-input border border-border rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              <img
                src={`data:image/jpeg;base64,${state.output}`}
                alt="Preview"
                className="max-w-full max-h-[380px] object-contain"
                onError={() => {
                  // Fallback to text if image fails
                  setters.setIsEncoded(false);
                }}
              />
            </div>
          ) : (
            <Textarea
              value={state.output}
              readOnly
              placeholder="Result will appear here..."
              className="code-editor min-h-[400px]"
            />
          )}
        </div>
      </div>

      {/* Info */}
      {state.output && (
        <div className="p-4 bg-card/50 rounded-lg text-sm text-muted-foreground">
          <p>
            Output length: {state.output.length} characters
            {helpers.isImagePreview && " • Image preview available"}
          </p>
        </div>
      )}
    </div>
  );
};
