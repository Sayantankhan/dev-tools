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
  Bold, Italic, Lock, ShieldCheck, Zap

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

  const hasDoc = state.pdfUrl && state.pdfDimensions && !state.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={state.fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={actions.handlePDFUpload}
        className="hidden"
      />

      {!hasDoc ? (
        /* ---------------- Empty state ---------------- */
        <div className="flex flex-1 items-start justify-center overflow-auto py-10">
          <div className="w-full max-w-3xl px-4">
            {/* Hero */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
                <FileText className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">PDF Editor</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Edit, sign, and annotate PDFs — entirely in your browser.
              </p>
            </div>

            {/* Dropzone card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => state.fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && state.fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`group mx-auto mt-8 max-w-[660px] cursor-pointer rounded-2xl border p-8 text-center outline-none transition-all duration-200
                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${dragOver
                  ? "border-primary bg-primary/10 shadow-lg"
                  : "border-border bg-card/70 shadow-sm hover:border-primary/60 hover:bg-card"}`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                <Upload className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="mt-4 text-base font-medium text-foreground">
                {state.isLoading ? "Loading your PDF…" : "Drag & drop your PDF here"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.isLoading ? "Parsing pages, one moment" : "or click to browse from your device"}
              </p>
              {state.isLoading && <Progress value={75} className="mx-auto mt-5 w-56" />}
              {!state.isLoading && (
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3 text-primary" strokeWidth={2} />
                  Files never leave your device
                </span>
              )}
            </div>

            {/* Feature highlights */}
            <div className="mx-auto mt-8 grid max-w-[660px] gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Private & client-side", body: "Everything runs locally in your browser." },
                { icon: PenTool, title: "Text & signatures", body: "Type, draw, mask and check boxes." },
                { icon: Zap, title: "No upload required", body: "Instant edits, no server round-trip." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-card/50 p-4 text-left">
                  <f.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  <div className="mt-2.5 text-sm font-medium text-foreground">{f.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- Editor: sidebar + canvas ---------------- */
        <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-[hsl(var(--background))]">
          {/* Sidebar */}
          <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-card md:flex">
            {/* File chip + Save */}
            <div className="space-y-3 border-b border-border p-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{state.pdfFile?.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {state.pdfFile ? formatBytes(state.pdfFile.size) : ""}
                    {state.totalPages ? ` · ${state.totalPages}p` : ""}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveEdited}
                className="h-9 w-full rounded-lg bg-primary font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
              >
                <Save className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                Save PDF
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
              {/* Insert */}
              <section className="space-y-1">
                <SectionLabel>Insert</SectionLabel>
                <SideRow icon={Type} label="Text" active={showTextInput} onClick={() => setShowTextInput(!showTextInput)} />
                {showTextInput && (
                  <Accordion>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={fontSize} onValueChange={setFontSize}>
                        <SelectTrigger className="h-8 rounded-lg text-xs" aria-label="Font size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                            <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className="h-8 rounded-lg text-xs" aria-label="Font family">
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
                    </div>

                    <div className="flex items-center gap-2">
                      <ColorSwatch value={textColor} onChange={setTextColor} />
                      <ToggleBtn active={isBold} onClick={() => setIsBold(!isBold)} icon={Bold} label="Bold" />
                      <ToggleBtn active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={Italic} label="Italic" />
                    </div>

                    <Input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Type your text…"
                      onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                      className="h-9 rounded-lg border-border text-sm transition-colors duration-150"
                    />
                    <Button
                      onClick={handleAddText}
                      className="h-9 w-full rounded-lg bg-primary text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
                    >
                      <Type className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                      Add Text
                    </Button>
                  </Accordion>
                )}

                <SideRow icon={PenTool} label="Draw" active={showSignaturePad} onClick={() => setShowSignaturePad(!showSignaturePad)} />
                {showSignaturePad && (
                  <Accordion>
                    <SignaturePad
                      onSave={handleSignaturePadSave}
                      onCancel={() => setShowSignaturePad(false)}
                    />
                  </Accordion>
                )}

                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleSignatureFileChange}
                  className="hidden"
                />
                <SideRow icon={Upload} label="Upload image" onClick={handleSignatureUploadClick} />
                <SideRow icon={Square} label="Checkbox" onClick={handleAddCheckbox} />
                <SideRow icon={Eraser} label="Mask" onClick={handleAddMask} />
              </section>

              {/* View */}
              <section className="space-y-1">
                <SectionLabel>View</SectionLabel>
                <div className="flex items-center gap-1.5 px-1 py-1">
                  <IconBtn onClick={handleZoomOut} disabled={zoom <= 0.5} icon={ZoomOut} label="Zoom out" />
                  <span className="flex-1 text-center text-xs font-medium tabular-nums text-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <IconBtn onClick={handleZoomIn} disabled={zoom >= 3} icon={ZoomIn} label="Zoom in" />
                </div>
                <SideRow icon={Grid3x3} label="Snap to grid" active={snapToGrid} onClick={() => setSnapToGrid(!snapToGrid)} />
                <SideRow
                  icon={showOverlays ? Eye : EyeOff}
                  label={showOverlays ? "Overlays visible" : "Overlays hidden"}
                  active={showOverlays}
                  onClick={toggleOverlays}
                />
              </section>

              {/* History */}
              <section className="space-y-1">
                <SectionLabel>History</SectionLabel>
                <SideRow icon={Undo2} label="Undo" hint="⌘Z" disabled={!canUndo} onClick={undo} />
                <SideRow icon={Redo2} label="Redo" hint="⌘Y" disabled={!canRedo} onClick={redo} />
              </section>

              {/* Selection */}
              {selectedObject && (
                <section className="space-y-1">
                  <SectionLabel>Selection</SectionLabel>
                  <SideRow icon={ArrowUpToLine} label="Bring to front" onClick={handleBringToFront} />
                  <SideRow icon={ArrowDownToLine} label="Send to back" onClick={handleSendToBack} />
                  <SideRow icon={Trash2} label="Delete selected" onClick={handleDeleteSelected} danger />
                  {(selectedObject as any).checkboxState && (
                    <div className="px-1 pt-1">
                      <Select
                        value={(selectedObject as any).checkboxState || "x"}
                        onValueChange={(value: "x" | "tick") => handleCheckboxChange(value)}
                      >
                        <SelectTrigger className="h-9 w-full rounded-lg text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100] rounded-lg">
                          <SelectItem value="x">✗ X Mark</SelectItem>
                          <SelectItem value="tick">✓ Tick Mark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* File actions */}
            <div className="space-y-1 border-t border-border p-3">
              <SectionLabel>Document</SectionLabel>
              <input
                ref={replaceInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleReplaceFileChange}
                className="hidden"
              />
              <SideRow icon={Upload} label="Replace PDF" onClick={() => replaceInputRef.current?.click()} />
              <SideRow icon={Save} label="Download original" onClick={actions.handleDownload} />
              <SideRow icon={Eraser} label="Clear page edits" onClick={handleClearCanvas} />
              <SideRow icon={Trash2} label="Remove PDF" onClick={handleClearPDF} danger />
            </div>
          </aside>

          {/* Main area */}
          <div className="flex min-w-0 flex-1 flex-col bg-muted/30">
            {/* Slim top bar (mobile save + tools fallback) */}
            <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2 md:hidden">
              <span className="truncate text-xs font-medium text-foreground">{state.pdfFile?.name}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <IconBtn onClick={() => setShowTextInput(!showTextInput)} active={showTextInput} icon={Type} label="Text" />
                <IconBtn onClick={() => setShowSignaturePad(!showSignaturePad)} active={showSignaturePad} icon={PenTool} label="Draw" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 rounded-lg" aria-label="More tools">
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={handleSignatureUploadClick}>
                      <Upload className="mr-2 h-4 w-4" strokeWidth={1.75} /> Upload image
                    </DropdownMenuItem>
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
                <Button size="sm" onClick={handleSaveEdited} className="h-9 rounded-lg bg-primary px-3 text-primary-foreground">
                  <Save className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            </div>

            {/* Mobile inline panels */}
            <div className="space-y-3 px-3 md:hidden">
              {showTextInput && (
                <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <ColorSwatch value={textColor} onChange={setTextColor} />
                    <ToggleBtn active={isBold} onClick={() => setIsBold(!isBold)} icon={Bold} label="Bold" />
                    <ToggleBtn active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={Italic} label="Italic" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Type your text…"
                      onKeyDown={(e) => e.key === "Enter" && handleAddText()}
                      className="h-9 flex-1 rounded-lg text-sm"
                    />
                    <Button onClick={handleAddText} className="h-9 rounded-lg bg-primary px-3 text-primary-foreground">
                      Add
                    </Button>
                  </div>
                </div>
              )}
              {showSignaturePad && (
                <div className="mt-3">
                  <SignaturePad onSave={handleSignaturePadSave} onCancel={() => setShowSignaturePad(false)} />
                </div>
              )}
            </div>

            {/* Canvas */}
            <div ref={viewerWrapperRef} className="relative min-h-0 flex-1 overflow-auto">
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

            {/* Docked footer: page nav + zoom */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-3 py-2">
              <div className="flex items-center gap-1.5">
                <IconBtn onClick={handlePrevPage} disabled={currentPage === 0} icon={ChevronLeft} label="Previous page" />
                <span className="px-1 text-xs font-medium tabular-nums text-foreground">
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
                  className="w-32 sm:w-40"
                  aria-label="Zoom level"
                />
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                <span className="min-w-[3rem] text-right text-xs font-medium tabular-nums text-foreground">
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

type BtnIcon = LucideIcon;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
    {children}
  </div>
);

const Accordion = ({ children }: { children: React.ReactNode }) => (
  <div className="ml-2 space-y-2 rounded-xl border border-border bg-background/60 p-3">{children}</div>
);

const SideRow = ({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  danger,
  hint,
}: {
  icon: BtnIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active === undefined ? undefined : active}
    className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-left text-sm font-medium transition-all duration-150
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card
      disabled:pointer-events-none disabled:opacity-35
      ${active
        ? "bg-primary/12 text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary"
        : danger
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
    <span className="truncate">{label}</span>
    {hint && <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70">{hint}</span>}
  </button>
);

const ColorSwatch = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <label
    className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background shadow-sm transition-all duration-150 hover:border-primary/60 focus-within:ring-2 focus-within:ring-ring"
    title="Text colour"
  >
    <span
      className="h-5 w-5 rounded-full ring-1 ring-inset ring-foreground/25 outline outline-1 outline-offset-1 outline-border"
      style={{ backgroundColor: value }}
      aria-hidden
    />
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Text colour"
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
    />
  </label>
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
        ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 active:scale-[0.95]
      disabled:pointer-events-none disabled:opacity-30
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
      ${active
        ? "border-primary/50 bg-primary/15 text-primary"
        : danger
          ? "border-transparent text-destructive hover:bg-destructive/10"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4" strokeWidth={1.75} />
  </button>
);



