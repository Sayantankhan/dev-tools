import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { 
  Upload, FileText, Trash2, Download, Save, Type, PenTool, 
  ArrowUpToLine, ArrowDownToLine, Undo2, Redo2, Eye, EyeOff,
  Grid3x3, ZoomIn, ZoomOut
} from "lucide-react";
import { PDFCanvasViewer } from "@/components/shared/PDFCanvasViewer";
import { PDFEditorCanvas } from "@/components/shared/PDFEditorCanvas";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricObject, IText, Image as FabricImage } from "fabric";
import { toast } from "sonner";

type OverlayAction = {
  type: 'add' | 'remove' | 'modify';
  object: any;
  previousState?: any;
};

export const PDFEditorTool = () => {
  const { state, actions } = PDFEditorStateHandler();
  const [editorCanvas, setEditorCanvas] = useState<FabricCanvas | null>(null);
  const viewerWrapperRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [textValue, setTextValue] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Text formatting
  const [fontSize, setFontSize] = useState("20");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Undo/Redo
  const [history, setHistory] = useState<OverlayAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!viewerWrapperRef.current) return;
    const el = viewerWrapperRef.current;
    const update = () => setViewSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!editorCanvas) return;
    
    const handleSelection = () => {
      const active = editorCanvas.getActiveObject();
      setSelectedObject(active || null);
    };

    editorCanvas.on('selection:created', handleSelection);
    editorCanvas.on('selection:updated', handleSelection);
    editorCanvas.on('selection:cleared', () => setSelectedObject(null));

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedObject) {
        handleDeleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      editorCanvas.off('selection:created', handleSelection);
      editorCanvas.off('selection:updated', handleSelection);
      editorCanvas.off('selection:cleared');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorCanvas, selectedObject, historyIndex]);

  const addToHistory = (action: OverlayAction) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex < 0 || !editorCanvas) return;
    const action = history[historyIndex];
    
    if (action.type === 'add') {
      editorCanvas.remove(action.object);
    } else if (action.type === 'remove') {
      editorCanvas.add(action.object);
    } else if (action.type === 'modify' && action.previousState) {
      action.object.set(action.previousState);
    }
    
    editorCanvas.renderAll();
    setHistoryIndex(historyIndex - 1);
    toast.success("Undone");
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || !editorCanvas) return;
    const action = history[historyIndex + 1];
    
    if (action.type === 'add') {
      editorCanvas.add(action.object);
    } else if (action.type === 'remove') {
      editorCanvas.remove(action.object);
    }
    
    editorCanvas.renderAll();
    setHistoryIndex(historyIndex + 1);
    toast.success("Redone");
  };

  const handleSaveEdited = async () => {
    if (!editorCanvas) return;
    await actions.handleDownloadEdited(editorCanvas);
  };

  const handleAddText = () => {
    if (!editorCanvas || !textValue.trim()) return;
    
    const text = new IText(textValue, {
      left: viewSize.width / 2 - 50,
      top: viewSize.height / 2,
      fontSize: parseInt(fontSize),
      fill: textColor,
      fontFamily: fontFamily,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
    });
    
    editorCanvas.add(text);
    editorCanvas.setActiveObject(text);
    editorCanvas.renderAll();
    
    addToHistory({ type: 'add', object: text });
    
    setTextValue("");
    setShowTextInput(false);
    toast.success("Text added - drag to position");
  };

  const handleSignatureUploadClick = () => {
    signatureInputRef.current?.click();
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!editorCanvas || !file) return;
    
    const url = URL.createObjectURL(file);
    const imgEl = new Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => {
      try {
        const img = new FabricImage(imgEl, {
          left: viewSize.width / 2 - (imgEl.naturalWidth * 0.3) / 2,
          top: viewSize.height / 2 - (imgEl.naturalHeight * 0.3) / 2,
          scaleX: 0.3,
          scaleY: 0.3,
        });
        editorCanvas.add(img);
        editorCanvas.setActiveObject(img);
        editorCanvas.renderAll();
        
        addToHistory({ type: 'add', object: img });
        toast.success("Signature added - drag to position");
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    imgEl.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Failed to load signature image");
    };
    imgEl.src = url;
  };

  const handleSignaturePadSave = (dataUrl: string) => {
    if (!editorCanvas) return;
    
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new FabricImage(imgEl, {
        left: viewSize.width / 2 - (imgEl.naturalWidth * 0.5) / 2,
        top: viewSize.height / 2 - (imgEl.naturalHeight * 0.5) / 2,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      editorCanvas.add(img);
      editorCanvas.setActiveObject(img);
      editorCanvas.renderAll();
      
      addToHistory({ type: 'add', object: img });
      setShowSignaturePad(false);
      toast.success("Signature added - drag to position");
    };
    imgEl.src = dataUrl;
  };

  const handleClearCanvas = () => {
    if (!editorCanvas) return;
    
    if (selectedObject) {
      editorCanvas.remove(selectedObject);
      addToHistory({ type: 'remove', object: selectedObject });
      setSelectedObject(null);
      toast.success("Selected overlay removed");
    } else {
      const objects = editorCanvas.getObjects();
      objects.forEach(obj => {
        editorCanvas.remove(obj);
        addToHistory({ type: 'remove', object: obj });
      });
      toast.success("All overlays cleared");
    }
    editorCanvas.renderAll();
  };

  const handleDeleteSelected = () => {
    if (!editorCanvas || !selectedObject) return;
    editorCanvas.remove(selectedObject);
    addToHistory({ type: 'remove', object: selectedObject });
    editorCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Overlay deleted");
  };

  const handleBringToFront = () => {
    if (!editorCanvas || !selectedObject) return;
    editorCanvas.bringObjectToFront(selectedObject);
    editorCanvas.renderAll();
    toast.success("Brought to front");
  };

  const handleSendToBack = () => {
    if (!editorCanvas || !selectedObject) return;
    editorCanvas.sendObjectToBack(selectedObject);
    editorCanvas.renderAll();
    toast.success("Sent to back");
  };

  const toggleOverlays = () => {
    if (!editorCanvas) return;
    const newState = !showOverlays;
    editorCanvas.getObjects().forEach(obj => {
      obj.visible = newState;
    });
    editorCanvas.renderAll();
    setShowOverlays(newState);
    toast.success(newState ? "Overlays shown" : "Overlays hidden");
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
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>Edit PDF (Page 1)</span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Text Tools */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTextInput(!showTextInput)}
                >
                  <Type className="w-4 h-4" />
                  Text
                </Button>
                
                {/* Signature Tools */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSignaturePad(!showSignaturePad)}
                >
                  <PenTool className="w-4 h-4" />
                  Draw Signature
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
                  <Upload className="w-4 h-4" />
                  Upload Signature
                </Button>

                {/* Object Controls */}
                {selectedObject && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBringToFront}
                    >
                      <ArrowUpToLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendToBack}
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {/* History Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex < 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>

                {/* View Controls */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleOverlays}
                >
                  {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={snapToGrid ? "bg-primary text-primary-foreground" : ""}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCanvas}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear {selectedObject ? "Selected" : "All"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdited}
                  className="flex items-center gap-2"
                  disabled={!editorCanvas}
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
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Courier New">Courier New</SelectItem>
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
            <div ref={viewerWrapperRef} className="relative border rounded-lg overflow-hidden bg-muted" style={{ minHeight: '600px' }}>
              <PDFCanvasViewer url={state.pdfUrl} />
              {viewSize.width > 0 && viewSize.height > 0 && (
                <div className="absolute inset-0 z-20">
                  <PDFEditorCanvas
                    width={viewSize.width}
                    height={viewSize.height}
                    onExport={setEditorCanvas}
                    snapToGrid={snapToGrid}
                    zoom={zoom}
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
            Clear All & Reset
          </Button>
        </div>
      )}
    </div>
  );
};
