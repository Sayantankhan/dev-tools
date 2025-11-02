import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileDown, Trash2, X } from "lucide-react";
import { PDFGeneratorStateHandler } from "@/modules/state/PDFGeneratorStateHandler";

export const PDFGeneratorTool = () => {
  const { state, setters, actions } = PDFGeneratorStateHandler();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>PDF Filename</Label>
          <Input
            value={state.fileName}
            onChange={(e) => setters.setFileName(e.target.value)}
            placeholder="document.pdf"
            className="mt-1"
          />
        </div>

        <input
          ref={state.fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={actions.handleImageUpload}
          className="hidden"
        />
        <Button onClick={() => state.fileInputRef.current?.click()} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Add Images
        </Button>

        <Button onClick={actions.handleGeneratePDF} className="btn-gradient">
          <FileDown className="w-4 h-4 mr-2" />
          Generate PDF
        </Button>

        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Text Content */}
      <div className="space-y-3">
        <Label>Text Content</Label>
        <Textarea
          value={state.textContent}
          onChange={(e) => setters.setTextContent(e.target.value)}
          placeholder="Enter text content for your PDF..."
          className="code-editor min-h-[200px]"
        />
      </div>

      {/* Image Previews */}
      {state.images.length > 0 && (
        <div className="space-y-3">
          <Label>Images ({state.images.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {state.images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => actions.handleRemoveImage(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
