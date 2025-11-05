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
              <div className="flex items-center justify-between">
                <Label>PDF Preview</Label>
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
              <div className="border rounded-lg overflow-hidden bg-muted">
                <object
                  data={state.pdfUrl}
                  type="application/pdf"
                  className="w-full h-[600px]"
                  aria-label="PDF Preview"
                >
                  <div className="flex flex-col items-center justify-center h-[600px] gap-4 p-6 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      PDF preview not available in this browser.
                    </p>
                    <Button onClick={actions.handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </object>
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
