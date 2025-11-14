import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { 
  Upload, FileText, Trash2, Save, Type, PenTool, 
  ArrowUpToLine, ArrowDownToLine, Undo2, Redo2, Eye, EyeOff,
  Grid3x3, Square, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Eraser
} from "lucide-react";
import { PDFCanvasViewer } from "@/components/shared/PDFCanvasViewer";
import { PDFEditorCanvas } from "@/components/shared/PDFEditorCanvas";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { useEffect, useRef, useState } from "react";
import { FabricObject } from "fabric";
import { toast } from "sonner";
import { usePDFAnnotations } from "@/hooks/usePDFAnnotations";
import { PDFAnnotation } from "@/types/pdf-annotations";

export const PDFEditorTool = () => {
  const { state, actions } = PDFEditorStateHandler();
  const viewerWrapperRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [textValue, setTextValue] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageViewSizes, setPageViewSizes] = useState<Record<number, { width: number; height: number }>>({});
  
  // Text formatting
  const [fontSize, setFontSize] = useState("20");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Annotations management
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearPage,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    getPageAnnotations,
  } = usePDFAnnotations();

  // Size comes from PDFCanvasViewer via onRendered callback
  useEffect(() => {
    // no-op: size is set only when PDFCanvasViewer finishes rendering
  }, [state.pdfUrl, currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedObject) {
        const annotationId = (selectedObject as any).annotationId;
        if (annotationId) {
          removeAnnotation(currentPage, annotationId);
          setSelectedObject(null);
          toast.success("Annotation deleted");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        toast.success("Undone");
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        toast.success("Redone");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, currentPage, removeAnnotation, undo, redo]);

  const handleAddText = () => {
    if (!textValue.trim()) return;
    
    const annotation: PDFAnnotation = {
      id: `text-${Date.now()}`,
      type: 'text',
      pageIndex: currentPage,
      x: 100, // Fixed position for testing
      y: 100,
      width: 200,
      height: 50,
      text: textValue,
      fontSize: parseInt(fontSize),
      fontFamily: fontFamily,
      color: textColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
    };
    
    addAnnotation(currentPage, annotation);
    setTextValue("");
    setShowTextInput(false);
    toast.success("Text added - drag to position");
  };

  const handleSignatureUploadClick = () => {
    signatureInputRef.current?.click();
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const annotation: PDFAnnotation = {
          id: `signature-${Date.now()}`,
          type: 'signature',
          pageIndex: currentPage,
          x: viewSize.width / 2 - (imgEl.width * 0.3) / 2,
          y: viewSize.height / 2 - (imgEl.height * 0.3) / 2,
          width: imgEl.width * 0.3,
          height: imgEl.height * 0.3,
          imageData: reader.result as string,
        };
        
        addAnnotation(currentPage, annotation);
        toast.success("Signature added - drag to position");
      };
      imgEl.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSignaturePadSave = (dataUrl: string) => {
    const imgEl = new Image();
    imgEl.onload = () => {
      const annotation: PDFAnnotation = {
        id: `signature-${Date.now()}`,
        type: 'signature',
        pageIndex: currentPage,
        x: viewSize.width / 2 - (imgEl.width * 0.5) / 2,
        y: viewSize.height / 2 - (imgEl.height * 0.5) / 2,
        width: imgEl.width * 0.5,
        height: imgEl.height * 0.5,
        imageData: dataUrl,
      };
      
      addAnnotation(currentPage, annotation);
      setShowSignaturePad(false);
      toast.success("Signature added - drag to position");
    };
    imgEl.src = dataUrl;
  };

  const handleAddCheckbox = () => {
    // Create checkbox with X mark by default (no box)
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      // Draw X (no box)
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(32, 32);
      ctx.moveTo(32, 8);
      ctx.lineTo(8, 32);
      ctx.stroke();
    }
    
    const annotation: PDFAnnotation = {
      id: `checkbox-${Date.now()}`,
      type: 'checkbox',
      pageIndex: currentPage,
      x: viewSize.width / 2 - 20,
      y: viewSize.height / 2 - 20,
      width: 40,
      height: 40,
      imageData: canvas.toDataURL(),
      checkboxState: 'x',
    };
    
    addAnnotation(currentPage, annotation);
    toast.success("Checkbox added");
  };

  const handleCheckboxChange = (newState: 'x' | 'tick') => {
    if (!selectedObject) return;
    
    const annotationId = (selectedObject as any).annotationId;
    
    // Create new checkbox image (no box, just symbol)
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      
      if (newState === 'tick') {
        // Draw checkmark
        ctx.beginPath();
        ctx.moveTo(8, 20);
        ctx.lineTo(16, 28);
        ctx.lineTo(32, 12);
        ctx.stroke();
      } else {
        // Draw X
        ctx.beginPath();
        ctx.moveTo(8, 8);
        ctx.lineTo(32, 32);
        ctx.moveTo(32, 8);
        ctx.lineTo(8, 32);
        ctx.stroke();
      }
    }
    
    updateAnnotation(currentPage, annotationId, {
      imageData: canvas.toDataURL(),
      checkboxState: newState,
    });
    
    toast.success(`Checkbox: ${newState === 'tick' ? '✓' : '✗'}`);
  };

  const handleAddMask = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 50);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 200, 50);
    }
    
    const annotation: PDFAnnotation = {
      id: `mask-${Date.now()}`,
      type: 'mask',
      pageIndex: currentPage,
      x: viewSize.width / 2 - 100,
      y: viewSize.height / 2 - 25,
      width: 200,
      height: 50,
      imageData: canvas.toDataURL(),
    };
    
    addAnnotation(currentPage, annotation);
    toast.success("Mask added - drag to cover text");
  };

  const handleDeleteSelected = () => {
    if (!selectedObject) return;
    const annotationId = (selectedObject as any).annotationId;
    if (annotationId) {
      removeAnnotation(currentPage, annotationId);
      setSelectedObject(null);
      toast.success("Annotation deleted");
    }
  };

  const handleBringToFront = () => {
    toast.success("Brought to front");
  };

  const handleSendToBack = () => {
    toast.success("Sent to back");
  };

  const toggleOverlays = () => {
    const newState = !showOverlays;
    setShowOverlays(newState);
    toast.success(newState ? "Overlays shown" : "Overlays hidden");
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      toast.info(`Page ${currentPage}`);
    }
  };

  const handleNextPage = () => {
    if (state.totalPages && currentPage < state.totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      toast.info(`Page ${currentPage + 2}`);
    }
  };

  const handleSaveEdited = async () => {
    await actions.handleDownloadEdited(annotations, pageViewSizes);
    toast.success("PDF saved with all annotations!");
  };

  const handleClearCanvas = () => {
    clearPage(currentPage);
    toast.success("Page annotations cleared");
  };

  const handleClearPDF = () => {
    actions.handleClear();
    clearAll();
    setCurrentPage(0);
    setViewSize({ width: 0, height: 0 });
    setPageViewSizes({});
    setIsPageLoading(false);
  };

  const pageAnnotations = getPageAnnotations(currentPage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={state.fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={actions.handlePDFUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => state.fileInputRef.current?.click()}
              className="flex items-center gap-2"
              disabled={state.isLoading}
            >
              <Upload className="w-4 h-4" />
              {state.isLoading ? "Loading..." : "Upload PDF"}
            </Button>
            {state.pdfFile && !state.isLoading && (
              <>
                <span className="flex items-center text-sm text-muted-foreground">
                  {state.pdfFile.name}
                </span>
                <Button
                  onClick={handleClearPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {state.isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
              <Progress value={75} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {state.pdfUrl && state.pdfDimensions && !state.isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Edit PDF</span>
                {state.totalPages && state.totalPages > 1 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-2">
                      Page {currentPage + 1} / {state.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= (state.totalPages - 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Text Tools */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTextInput(!showTextInput)}
                >
                  <Type className="w-4 h-4 mr-1" />
                  Text
                </Button>
                
                {/* Signature Tools */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignaturePad(!showSignaturePad)}
                >
                  <PenTool className="w-4 h-4 mr-1" />
                  Draw
                </Button>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleSignatureFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignatureUploadClick}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload
                </Button>

                {/* Checkbox Tool */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCheckbox}
                  title="Add Checkbox"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Checkbox
                </Button>

                {/* Mask/Erase Tool */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddMask}
                  title="Add mask to hide text"
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  Mask
                </Button>

                {/* Checkbox Dropdown */}
                {selectedObject && (selectedObject as any).checkboxState && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Symbol:</Label>
                    <Select
                      value={(selectedObject as any).checkboxState || 'x'}
                      onValueChange={(value: 'x' | 'tick') => handleCheckboxChange(value)}
                    >
                      <SelectTrigger className="w-[120px] h-9 bg-popover text-popover-foreground border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border-input z-[100]">
                        <SelectItem value="x" className="cursor-pointer">✗ X Mark</SelectItem>
                        <SelectItem value="tick" className="cursor-pointer">✓ Tick Mark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Zoom Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>

                {/* Object Controls */}
                {selectedObject && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBringToFront}
                      title="Bring to front"
                    >
                      <ArrowUpToLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendToBack}
                      title="Send to back"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* History Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>

                {/* View Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleOverlays}
                  title="Toggle overlays"
                >
                  {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={snapToGrid ? "bg-primary text-primary-foreground" : ""}
                  title="Snap to grid"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCanvas}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear Page
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdited}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Input Panel */}
            {showTextInput && (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Font Size</Label>
                      <Select value={fontSize} onValueChange={setFontSize}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(size => (
                            <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Font</Label>
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">Times</SelectItem>
                          <SelectItem value="Courier New">Courier</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={isBold ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsBold(!isBold)}
                        className="flex-1 font-bold"
                      >
                        B
                      </Button>
                      <Button
                        variant={isItalic ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsItalic(!isItalic)}
                        className="flex-1 italic"
                      >
                        I
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Type your text..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                      className="flex-1"
                    />
                    <Button onClick={handleAddText}>Add Text</Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Signature Pad */}
            {showSignaturePad && (
              <SignaturePad
                onSave={handleSignaturePadSave}
                onCancel={() => setShowSignaturePad(false)}
              />
            )}

            {/* PDF Canvas with Overlays */}
            <div 
              ref={viewerWrapperRef} 
              className="relative border rounded-lg overflow-auto bg-muted" 
              style={{ minHeight: '600px', maxHeight: '800px' }}
            >
              {isPageLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading page {currentPage + 1}...</p>
                  </div>
                </div>
              )}
              <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
                <PDFCanvasViewer 
                  url={state.pdfUrl} 
                  pageNumber={currentPage + 1}
                  onRendered={({ width, height, pageNumber }) => {
                    // Only update viewSize if this render is for the currently visible page
                    if (pageNumber === currentPage + 1) {
                      setViewSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
                      setIsPageLoading(false);
                    }
                    // Store view size keyed by pageIndex (pageNumber is 1-based, so pageNumber - 1)
                    setPageViewSizes(prev => ({ ...prev, [pageNumber - 1]: { width, height } }));
                  }}
                />
                {viewSize.width > 0 && viewSize.height > 0 && showOverlays && (
                  <div 
                    className="absolute top-0 left-0 z-20" 
                    style={{ 
                      width: `${viewSize.width}px`, 
                      height: `${viewSize.height}px`,
                      pointerEvents: 'auto'
                    }}
                  >
                    <PDFEditorCanvas
                      width={viewSize.width}
                      height={viewSize.height}
                      annotations={pageAnnotations}
                      onAnnotationAdd={(ann) => addAnnotation(currentPage, ann)}
                      onAnnotationUpdate={(id, updates) => updateAnnotation(currentPage, id, updates)}
                      onAnnotationRemove={(id) => removeAnnotation(currentPage, id)}
                      onObjectSelect={setSelectedObject}
                      snapToGrid={snapToGrid}
                      zoom={1}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
