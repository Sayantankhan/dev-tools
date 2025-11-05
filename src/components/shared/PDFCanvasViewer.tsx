import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Use local worker from pdfjs-dist package
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface PDFCanvasViewerProps {
  url: string;
}

export const PDFCanvasViewer: React.FC<PDFCanvasViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let destroyed = false as boolean;
    let loadingTask: any;

    (async () => {
      try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || destroyed) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
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
  }, [url]);

  return <canvas ref={canvasRef} className="w-full h-auto bg-background" />;
};

export default PDFCanvasViewer;
