import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileDown, Trash2, X, FileText, FileType, Image as ImageIcon, ArrowUp, ArrowDown, Loader2, Link2, Link2Off } from "lucide-react";
import { PDFGeneratorStateHandler, PdfSourceItem } from "@/modules/state/PDFGeneratorStateHandler";

const KindIcon = ({ kind }: { kind: PdfSourceItem["kind"] }) => {
  if (kind === "image") return <ImageIcon className="w-4 h-4 text-primary" />;
  if (kind === "pdf") return <FileType className="w-4 h-4 text-primary" />;
  return <FileText className="w-4 h-4 text-primary" />;
};

export const PDFGeneratorTool = () => {
  const { state, setters, actions } = PDFGeneratorStateHandler();
  const items: PdfSourceItem[] = state.items;

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
          accept="image/*,application/pdf,text/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.html,.htm,.xml,.yml,.yaml,.js,.ts,.tsx,.jsx,.css,.py,.sh,.docx"
          multiple
          onChange={actions.handleImageUpload}
          className="hidden"
        />
        <Button onClick={() => state.fileInputRef.current?.click()} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Add Files
        </Button>

        <Button onClick={actions.handleGeneratePDF} className="btn-gradient" disabled={state.isGenerating}>
          {state.isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 mr-2" />
          )}
          Generate PDF
        </Button>

        <Button onClick={actions.handleClear} variant="outline">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Supported: images (JPG/PNG/WEBP), text files (TXT, MD, CSV, JSON, HTML, XML, YAML, code), DOCX, and PDFs (merged in order).
      </p>

      {/* Free-form text */}
      <div className="space-y-3">
        <Label>Text Content (optional)</Label>
        <Textarea
          value={state.textContent}
          onChange={(e) => setters.setTextContent(e.target.value)}
          placeholder="Enter text content for your PDF..."
          className="code-editor min-h-[160px]"
        />
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <Label>Files ({items.length}) — reorder, or link an item to the previous to share a page</Label>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card/50 ${item.samePageAsPrevious ? "border-primary/60" : "border-border"}`}
              >
                {item.kind === "image" && item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded border border-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center rounded border border-border bg-background shrink-0">
                    <KindIcon kind={item.kind} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{item.kind}</div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => actions.handleToggleSamePage(index)}
                    disabled={index === 0}
                    title={item.samePageAsPrevious ? "On same page as previous — click to move to a new page" : "Starts a new page — click to keep on same page as previous"}
                  >
                    {item.samePageAsPrevious ? (
                      <Link2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Link2Off className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => actions.handleMoveItem(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => actions.handleMoveItem(index, 1)}
                    disabled={index === items.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => actions.handleRemoveImage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
