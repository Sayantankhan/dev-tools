import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { PDF_PREVIEW_SCALE } from "@/lib/pdf";

// Use local worker from pdfjs-dist package
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface PDFCanvasViewerProps {
  url: string;
  pageNumber?: number;
  onRendered?: (size: { width: number; height: number }) => void;
}

export const PDFCanvasViewer: React.FC<PDFCanvasViewerProps> = ({ url, pageNumber = 1, onRendered }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cbRef = useRef<typeof onRendered>(onRendered);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  
  useEffect(() => {
    cbRef.current = onRendered;
  }, [onRendered]);

  // Load PDF once per URL
  useEffect(() => {
    let destroyed = false;
    let loadingTask: any;
    setPdfLoaded(false);
    setIsRendering(true);
    pdfRef.current = null;
    
    (async () => {
      try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (destroyed) return;
        pdfRef.current = pdf;
        setPdfLoaded(true);
      } catch (err) {
        console.error(err);
        toast.error("Unable to preview PDF. Use Download/Open instead.");
        setIsRendering(false);
      }
    })();

    return () => {
      destroyed = true;
      try { loadingTask?.destroy?.(); } catch {}
      try { renderTaskRef.current?.cancel?.(); } catch {}
      pdfRef.current = null;
      setPdfLoaded(false);
    };
  }, [url]);

  // Render requested page after PDF loads
  useEffect(() => {
    if (!pdfLoaded || !pdfRef.current) return;
    
    setIsRendering(true);
    let cancelled = false;
    (async () => {
      try {
        const pdf = pdfRef.current;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_PREVIEW_SCALE });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;
        setIsRendering(false);
        cbRef.current?.({ width: canvas.width, height: canvas.height });
      } catch (err) {
        if ((err as any)?.name === 'RenderingCancelledException') return;
        console.error(err);
        setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel?.(); } catch {}
    };
  }, [pdfLoaded, pageNumber]);

  return (
    <div className="relative w-full h-auto">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10" style={{ minHeight: '400px' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading page {pageNumber}...</p>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-auto bg-background" style={{ opacity: isRendering ? 0 : 1 }} />
    </div>
  );
};

export default PDFCanvasViewer;
