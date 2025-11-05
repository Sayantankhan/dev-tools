import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { Upload, FileText, Trash2, Download } from "lucide-react";

export const PDFEditorTool = () => {
  const { state, actions } = PDFEditorStateHandler();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select PDF File</Label>
            <input
              ref={state.fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={actions.handlePDFUpload}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => state.fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </Button>
              {state.pdfFile && (
                <span className="flex items-center text-sm text-muted-foreground">
                  {state.pdfFile.name}
                </span>
              )}
            </div>
          </div>

          {state.pdfUrl && (
            <div className="space-y-3">
              <Label>PDF Preview</Label>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={state.pdfUrl}
                  className="w-full h-[400px]"
                  title="PDF Preview"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Draw Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Signature Pad</Label>
            <div className="border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={state.canvasRef}
                width={600}
                height={200}
                onMouseDown={actions.startDrawing}
                onMouseMove={actions.draw}
                onMouseUp={actions.stopDrawing}
                onMouseLeave={actions.stopDrawing}
                className="w-full cursor-crosshair"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Draw your signature in the box above
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={actions.handleClearSignature}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Signature
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={actions.handleApplySignature}
          disabled={!state.pdfFile || !state.signatureDataUrl}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Sign & Download PDF
        </Button>
        <Button
          onClick={actions.handleClear}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </Button>
      </div>
    </div>
  );
};
