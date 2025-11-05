import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { PDFCanvasViewer } from "@/components/shared/PDFCanvasViewer";

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
              <div className="flex items-center justify-between">
                <Label>PDF Preview (first page)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(state.pdfUrl, "_blank", "noopener,noreferrer")}
                  >
                    Open in new tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.handleDownload}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden bg-muted">
                <PDFCanvasViewer url={state.pdfUrl} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {state.pdfFile && (
        <div className="flex gap-2">
          <Button
            onClick={actions.handleClear}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
