import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDFEditorStateHandler } from "@/modules/state/PDFEditorStateHandler";
import { 
  Upload, FileText, Trash2, Save, Type, PenTool, 
  ArrowUpToLine, ArrowDownToLine, Undo2, Redo2, Eye, EyeOff,
  Grid3x3, Square, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Eraser, MoreHorizontal,
  Bold, Italic

} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageViewSizes, setPageViewSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [dragOver, setDragOver] = useState(false);
  
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
    const canvas = (selectedObject as any)?.canvas;
    if (!canvas || !selectedObject) return;
    canvas.bringObjectToFront?.(selectedObject);
    canvas.requestRenderAll();
    toast.success("Brought to front");
  };

  const handleSendToBack = () => {
    const canvas = (selectedObject as any)?.canvas;
    if (!canvas || !selectedObject) return;
    canvas.sendObjectToBack?.(selectedObject);
    canvas.requestRenderAll();
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

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset editor state tied to the old document before loading the new one
    clearAll();
    setSelectedObject(null);
    setCurrentPage(0);
    setViewSize({ width: 0, height: 0 });
    setPageViewSizes({});
    await actions.handlePDFUpload(e);
    if (e.target) e.target.value = "";
  };


  const pageAnnotations = getPageAnnotations(currentPage);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) {
      actions.handlePDFUpload({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={state.fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={actions.handlePDFUpload}
        className="hidden"
      />

      {/* Upload / File chip */}
      {!state.pdfFile || state.isLoading ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => state.fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && state.fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 outline-none
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
            ${dragOver ? "border-primary bg-primary/10" : "border-border/70 bg-card/40 hover:border-primary/60 hover:bg-card/70"}`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
            <Upload className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-base font-medium text-foreground">
            {state.isLoading ? "Loading your PDF…" : "Drag & drop your PDF here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.isLoading ? "Parsing pages, one moment" : "or click to browse — files never leave your device"}
          </p>
          {state.isLoading && <Progress value={75} className="mx-auto mt-5 w-56" />}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 pl-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{state.pdfFile.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(state.pdfFile.size)}
              {state.totalPages ? ` · ${state.totalPages} page${state.totalPages > 1 ? "s" : ""}` : ""}
            </div>
          </div>
          <input
            ref={replaceInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleReplaceFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg transition-colors duration-150"
            onClick={() => replaceInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Replace
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-destructive"
            onClick={handleClearPDF}
            title="Remove PDF"
            aria-label="Remove PDF"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      )}

      {state.pdfUrl && state.pdfDimensions && !state.isLoading && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
          {/* Sticky toolbar */}
          <div className="sticky top-0 z-30 rounded-t-2xl border-b border-border/60 bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {/* Group 1 — Insert */}
              <ToolBtn active={showTextInput} onClick={() => setShowTextInput(!showTextInput)} icon={Type} label="Text" />
              <ToolBtn active={showSignaturePad} onClick={() => setShowSignaturePad(!showSignaturePad)} icon={PenTool} label="Draw" />
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleSignatureFileChange}
                className="hidden"
              />
              <ToolBtn onClick={handleSignatureUploadClick} icon={Upload} label="Upload" />
              <span className="hidden sm:contents">
                <ToolBtn onClick={handleAddCheckbox} icon={Square} label="Checkbox" />
                <ToolBtn onClick={handleAddMask} icon={Eraser} label="Mask" />
              </span>

              {/* Overflow on small screens */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 rounded-lg transition-colors duration-150 sm:hidden" aria-label="More tools">
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={handleAddCheckbox}>
                    <Square className="mr-2 h-4 w-4" strokeWidth={1.75} /> Checkbox
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddMask}>
                    <Eraser className="mr-2 h-4 w-4" strokeWidth={1.75} /> Mask
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClearCanvas}>
                    <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> Clear page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Divider />

              {/* Group 2 — View */}
              <IconBtn onClick={handleZoomOut} disabled={zoom <= 0.5} icon={ZoomOut} label="Zoom out" />
              <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <IconBtn onClick={handleZoomIn} disabled={zoom >= 3} icon={ZoomIn} label="Zoom in" />
              <IconBtn onClick={() => setSnapToGrid(!snapToGrid)} active={snapToGrid} icon={Grid3x3} label="Snap to grid" />
              <IconBtn onClick={toggleOverlays} active={showOverlays} icon={showOverlays ? Eye : EyeOff} label="Toggle overlays" />

              <Divider />

              {/* Group 3 — History */}
              <IconBtn onClick={undo} disabled={!canUndo} icon={Undo2} label="Undo (Ctrl+Z)" />
              <IconBtn onClick={redo} disabled={!canRedo} icon={Redo2} label="Redo (Ctrl+Y)" />

              {/* Selection-contextual */}
              {selectedObject && (
                <>
                  <Divider />
                  <IconBtn onClick={handleBringToFront} icon={ArrowUpToLine} label="Bring to front" />
                  <IconBtn onClick={handleSendToBack} icon={ArrowDownToLine} label="Send to back" />
                  <IconBtn onClick={handleDeleteSelected} icon={Trash2} label="Delete selected" danger />
                  {(selectedObject as any).checkboxState && (
                    <>
                      <Divider />
                      <Select
                        value={(selectedObject as any).checkboxState || "x"}
                        onValueChange={(value: "x" | "tick") => handleCheckboxChange(value)}
                      >
                        <SelectTrigger className="h-9 w-[124px] rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100] rounded-lg">
                          <SelectItem value="x">✗ X Mark</SelectItem>
                          <SelectItem value="tick">✓ Tick Mark</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </>
              )}

              {/* Group 4 — Primary */}
              <div className="ml-auto flex items-center gap-2">
                <Divider className="hidden sm:inline-block" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCanvas}
                  className="hidden h-9 rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground sm:inline-flex"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Clear page
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdited}
                  className="h-9 rounded-lg bg-primary px-4 text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.97]"
                >
                  <Save className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Save PDF
                </Button>
              </div>

            </div>
          </div>

          <div className="space-y-4 p-4">
            {/* Text Input Panel */}
            {showTextInput && (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                <div className="space-y-3">
                  {/* Unified formatting row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger className="h-9 w-[92px] rounded-lg" aria-label="Font size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                          <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="h-9 w-[150px] rounded-lg" aria-label="Font family">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Times New Roman">Times</SelectItem>
                        <SelectItem value="Courier New">Courier</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>

                    <Divider />

                    <label
                      className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/70 shadow-sm transition-all duration-150 hover:scale-105 focus-within:ring-2 focus-within:ring-ring"
                      title="Text colour"
                    >
                      <span
                        className="h-6 w-6 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: textColor }}
                        aria-hidden
                      />
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        aria-label="Text colour"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>

                    <ToggleBtn active={isBold} onClick={() => setIsBold(!isBold)} icon={Bold} label="Bold" />
                    <ToggleBtn active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={Italic} label="Italic" />
                  </div>

                  {/* Input row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Type your text…"
                      onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                      className="h-9 min-w-[180px] flex-1 rounded-lg border-border/70 transition-colors duration-150"
                    />
                    <Button
                      onClick={handleAddText}
                      className="h-9 shrink-0 rounded-lg bg-primary px-4 text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.97]"
                    >
                      <Type className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                      Add Text
                    </Button>
                  </div>
                </div>
              </div>
            )}


            {/* Signature Pad */}
            {showSignaturePad && (
              <SignaturePad
                onSave={handleSignaturePadSave}
                onCancel={() => setShowSignaturePad(false)}
              />
            )}

            {/* Document canvas */}
            <div
              ref={viewerWrapperRef}
              className="relative overflow-auto rounded-xl border border-border/60 bg-muted/60"
              style={{ minHeight: "600px", maxHeight: "800px" }}
            >
              {isPageLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading page {currentPage + 1}…</p>
                  </div>
                </div>
              )}

              <div className="flex min-h-full w-full justify-center p-6 md:p-10">
                <div
                  className="relative shrink-0 rounded-sm bg-white shadow-[0_24px_60px_-16px_rgba(0,0,0,0.65)] ring-1 ring-black/10 transition-transform duration-200"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: "fit-content" }}
                >
                  <PDFCanvasViewer
                    url={state.pdfUrl}
                    pageNumber={currentPage + 1}
                    onRendered={({ width, height, pageNumber }) => {
                      if (pageNumber === currentPage + 1) {
                        setViewSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
                        setIsPageLoading(false);
                      }
                      setPageViewSizes((prev) => ({ ...prev, [pageNumber - 1]: { width, height } }));
                    }}
                  />
                  {viewSize.width > 0 && viewSize.height > 0 && showOverlays && (
                    <div
                      className="absolute left-0 top-0 z-20"
                      style={{ width: `${viewSize.width}px`, height: `${viewSize.height}px`, pointerEvents: "auto" }}
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
            </div>

            {/* Floating footer: page nav + zoom slider */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <IconBtn onClick={handlePrevPage} disabled={currentPage === 0} icon={ChevronLeft} label="Previous page" />
                <span className="px-1 text-xs font-medium tabular-nums text-muted-foreground">
                  Page {currentPage + 1} of {state.totalPages || 1}
                </span>
                <IconBtn
                  onClick={handleNextPage}
                  disabled={!state.totalPages || currentPage >= state.totalPages - 1}
                  icon={ChevronRight}
                  label="Next page"
                />
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                <Slider
                  value={[zoom * 100]}
                  min={50}
                  max={300}
                  step={5}
                  onValueChange={([v]) => setZoom(v / 100)}
                  className="w-40"
                  aria-label="Zoom level"
                />
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-[3rem] text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Divider = ({ className = "" }: { className?: string }) => (
  <span className={`h-6 w-px shrink-0 bg-border/70 ${className}`} aria-hidden />
);

type BtnIcon = LucideIcon;

const ToolBtn = ({
  icon: Icon,
  label,
  onClick,
  active,
}: { icon: BtnIcon; label: string; onClick: () => void; active?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={!!active}
    className={`relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-all duration-150 active:scale-[0.97]
      after:pointer-events-none after:absolute after:inset-x-2.5 after:-bottom-[3px] after:h-[2px] after:rounded-full after:transition-all after:duration-150
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
      ${active
        ? "bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_2px_10px_-4px_hsl(var(--primary)/0.5)] after:bg-primary"
        : "text-muted-foreground after:bg-transparent hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4" strokeWidth={1.75} />
    {label}
  </button>
);

const ToggleBtn = ({
  icon: Icon,
  label,
  onClick,
  active,
}: { icon: BtnIcon; label: string; onClick: () => void; active?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={!!active}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 active:scale-[0.95]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
      ${active
        ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
        : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4" strokeWidth={1.75} />
  </button>
);

const IconBtn = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  danger,
}: { icon: BtnIcon; label: string; onClick: () => void; disabled?: boolean; active?: boolean; danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    aria-pressed={active === undefined ? undefined : active}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 active:scale-[0.95]
      disabled:pointer-events-none disabled:opacity-40
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
      ${active
        ? "bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
        : danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4" strokeWidth={1.75} />
  </button>
);


