import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEffect, useRef, useState, useCallback } from "react";
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
  const [currentPage, setCurrentPage] = useState(0);
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

  // Measure viewer size
  useEffect(() => {
    if (!viewerWrapperRef.current) return;
    const el = viewerWrapperRef.current;
    const update = () => setViewSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const addToHistory = useCallback((action: OverlayAction) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(action);
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex < 0 || !editorCanvas) return;
    
    setHistory(prev => {
      const action = prev[historyIndex];
      
      if (action.type === 'add') {
        editorCanvas.remove(action.object);
      } else if (action.type === 'remove') {
        editorCanvas.add(action.object);
      } else if (action.type === 'modify' && action.previousState) {
        action.object.set(action.previousState);
      }
      
      editorCanvas.renderAll();
      return prev;
    });
    
    setHistoryIndex(prev => prev - 1);
    toast.success("Undone");
  }, [historyIndex, editorCanvas]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !editorCanvas) return;
    
    const action = history[historyIndex + 1];
    
    if (action.type === 'add') {
      editorCanvas.add(action.object);
    } else if (action.type === 'remove') {
      editorCanvas.remove(action.object);
    }
    
    editorCanvas.renderAll();
    setHistoryIndex(prev => prev + 1);
    toast.success("Redone");
  }, [historyIndex, history, editorCanvas]);

  const handleDeleteSelected = useCallback(() => {
    if (!editorCanvas || !selectedObject) return;
    editorCanvas.remove(selectedObject);
    addToHistory({ type: 'remove', object: selectedObject });
    editorCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Overlay deleted");
  }, [editorCanvas, selectedObject, addToHistory]);

  // Setup canvas event listeners
  useEffect(() => {
    if (!editorCanvas) return;
    
    const handleSelection = () => {
      const active = editorCanvas.getActiveObject();
      setSelectedObject(active || null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && editorCanvas.getActiveObject()) {
        const obj = editorCanvas.getActiveObject();
        if (obj) {
          editorCanvas.remove(obj);
          addToHistory({ type: 'remove', object: obj });
          editorCanvas.renderAll();
          setSelectedObject(null);
          toast.success("Overlay deleted");
        }
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

    editorCanvas.on('selection:created', handleSelection);
    editorCanvas.on('selection:updated', handleSelection);
    editorCanvas.on('selection:cleared', () => setSelectedObject(null));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      editorCanvas.off('selection:created', handleSelection);
      editorCanvas.off('selection:updated', handleSelection);
      editorCanvas.off('selection:cleared');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorCanvas, addToHistory, handleUndo, handleRedo]);

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

  const handleAddCheckbox = () => {
    if (!editorCanvas) return;
    
    // Create checkbox with X mark by default
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 36, 36);
      // Draw X
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(32, 32);
      ctx.moveTo(32, 8);
      ctx.lineTo(8, 32);
      ctx.stroke();
    }
    
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new FabricImage(imgEl, {
        left: viewSize.width / 2 - 20,
        top: viewSize.height / 2 - 20,
        selectable: true,
        hasControls: true,
      });
      (img as any).checkboxState = 'x'; // Custom property to track state
      editorCanvas.add(img);
      editorCanvas.setActiveObject(img);
      editorCanvas.renderAll();
      addToHistory({ type: 'add', object: img });
      toast.success("Checkbox added - click to toggle");
    };
    imgEl.src = canvas.toDataURL();
  };

  const handleToggleCheckbox = () => {
    if (!editorCanvas || !selectedObject) return;
    
    const state = (selectedObject as any).checkboxState || 'x';
    const newState = state === 'x' ? 'tick' : 'x';
    
    // Create new checkbox image
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 36, 36);
      
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
    
    const imgEl = new Image();
    imgEl.onload = () => {
      if (selectedObject instanceof FabricImage) {
        const currentProps = {
          left: selectedObject.left,
          top: selectedObject.top,
          scaleX: selectedObject.scaleX,
          scaleY: selectedObject.scaleY,
          angle: selectedObject.angle,
        };
        
        editorCanvas.remove(selectedObject);
        
        const newImg = new FabricImage(imgEl, {
          ...currentProps,
          selectable: true,
          hasControls: true,
        });
        (newImg as any).checkboxState = newState;
        
        editorCanvas.add(newImg);
        editorCanvas.setActiveObject(newImg);
        setSelectedObject(newImg);
        editorCanvas.renderAll();
        toast.success(`Checkbox: ${newState === 'tick' ? '✓' : '✗'}`);
      }
    };
    imgEl.src = canvas.toDataURL();
  };

  const handleAddMask = () => {
    if (!editorCanvas) return;
    
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
    
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new FabricImage(imgEl, {
        left: viewSize.width / 2 - 100,
        top: viewSize.height / 2 - 25,
        selectable: true,
        hasControls: true,
      });
      editorCanvas.add(img);
      editorCanvas.setActiveObject(img);
      editorCanvas.renderAll();
      addToHistory({ type: 'add', object: img });
      toast.success("Mask added - drag to cover text");
    };
    imgEl.src = canvas.toDataURL();
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

                {/* Object Controls */}
                {selectedObject && (selectedObject as any).checkboxState && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleCheckbox}
                    title="Toggle checkbox"
                  >
                    Toggle ✓/✗
                  </Button>
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
                  onClick={handleUndo}
                  disabled={historyIndex < 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
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
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                <PDFCanvasViewer url={state.pdfUrl} pageNumber={currentPage + 1} />
                {viewSize.width > 0 && viewSize.height > 0 && (
                  <div className="absolute inset-0 z-20 pointer-events-none" style={{ width: `${viewSize.width}px`, height: `${viewSize.height}px` }}>
                    <div className="pointer-events-auto w-full h-full">
                      <PDFEditorCanvas
                        width={viewSize.width}
                        height={viewSize.height}
                        onExport={setEditorCanvas}
                        snapToGrid={snapToGrid}
                        zoom={zoom}
                      />
                    </div>
                  </div>
                )}
              </div>
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
