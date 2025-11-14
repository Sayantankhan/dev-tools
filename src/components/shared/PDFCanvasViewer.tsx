import React, { useEffect, useRef } from "react";
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
  // Keep a stable callback reference to avoid re-running effect when parent re-renders
  const cbRef = useRef<typeof onRendered>(onRendered);
  const pdfRef = useRef<any>(null); // cache loaded pdf document
  const renderTaskRef = useRef<any>(null);
  useEffect(() => {
    cbRef.current = onRendered;
  }, [onRendered]);

  // Load PDF once per URL
  useEffect(() => {
    let destroyed = false as boolean;
    let loadingTask: any;
    (async () => {
      try {
        // Prefer data loading to avoid CORS issues
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (destroyed) return;
        pdfRef.current = pdf;
        // Trigger initial render for current page
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error(err);
        toast.error("Unable to preview PDF. Use Download/Open instead.");
      }
    })();

    return () => {
      destroyed = true;
      try { loadingTask?.destroy?.(); } catch {}
      try { renderTaskRef.current?.cancel?.(); } catch {}
      pdfRef.current = null;
    };
  }, [url]);

  // Render requested page quickly using cached doc
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdf = pdfRef.current ?? (await pdfjsLib.getDocument({ url }).promise);
        pdfRef.current = pdf;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_PREVIEW_SCALE });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        // Immediately clear and resize to avoid showing previous page
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;
        cbRef.current?.({ width: canvas.width, height: canvas.height });
      } catch (err) {
        if ((err as any)?.name === 'RenderingCancelledException') return;
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel?.(); } catch {}
    };
  }, [pageNumber, url]);

  return <canvas ref={canvasRef} className="w-full h-auto bg-background" />;
};

export default PDFCanvasViewer;
