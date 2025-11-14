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
  useEffect(() => {
    cbRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    let destroyed = false as boolean;
    let loadingTask: any;

    (async () => {
      try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_PREVIEW_SCALE });
        const canvas = canvasRef.current;
        if (!canvas || destroyed) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        // Notify parent about actual size
        cbRef.current?.({ width: canvas.width, height: canvas.height });
      } catch (err) {
        console.error(err);
        toast.error("Unable to preview PDF. Use Download/Open instead.");
      }
    })();

    return () => {
      destroyed = true;
      try {
        loadingTask?.destroy?.();
      } catch {}
    };
  }, [url, pageNumber]);

  return <canvas ref={canvasRef} className="w-full h-auto bg-background" />;
};

export default PDFCanvasViewer;
