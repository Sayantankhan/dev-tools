import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { Upload, FileText, Trash2, Download, Save } from "lucide-react";
import { PDFCanvasViewer } from "@/components/shared/PDFCanvasViewer";
import { PDFEditorCanvas } from "@/components/shared/PDFEditorCanvas";
import { useEffect, useRef, useState } from "react";

export const PDFEditorTool = () => {
  const { state, actions } = PDFEditorStateHandler();
  const [editorCanvas, setEditorCanvas] = useState<any>(null);
  const viewerWrapperRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!viewerWrapperRef.current) return;
    const el = viewerWrapperRef.current;
    const update = () => setViewSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSaveEdited = () => {
    if (!editorCanvas) return;
    actions.handleDownloadEdited(editorCanvas);
  };

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
        </CardContent>
      </Card>

      {state.pdfUrl && state.pdfDimensions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Edit PDF (first page)</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(state.pdfUrl, "_blank", "noopener,noreferrer")}
                >
                  Open Original
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdited}
                  className="flex items-center gap-2"
                  disabled={!editorCanvas}
                >
                  <Save className="w-4 h-4" />
                  Save & Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={viewerWrapperRef} className="relative border rounded-lg overflow-hidden bg-muted">
              <PDFCanvasViewer url={state.pdfUrl} />
              {viewSize.width > 0 && viewSize.height > 0 && (
                <div className="absolute inset-0 z-20">
                  <PDFEditorCanvas
                    width={viewSize.width}
                    height={viewSize.height}
                    onExport={setEditorCanvas}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {state.pdfFile && (
        <div className="flex gap-2">
          <Button
            onClick={actions.handleClear}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
