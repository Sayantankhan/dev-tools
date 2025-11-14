import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { PDF_PREVIEW_SCALE } from "@/lib/pdf";
export const PDFEditorStateHandler = (): ToolHandler => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actions = {
    handlePDFUpload: async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }

      setIsLoading(true);
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      // Get PDF dimensions and page count
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const firstPage = pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();
        setPdfDimensions({ width, height });
        setTotalPages(pdfDoc.getPageCount());
        toast.success(`PDF uploaded (${pdfDoc.getPageCount()} page${pdfDoc.getPageCount() > 1 ? 's' : ''})`);
      } catch (error) {
        console.error("Failed to get PDF dimensions:", error);
        toast.error("Failed to load PDF");
      } finally {
        setIsLoading(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    handleDownloadEdited: async (annotations: any) => {
      if (!pdfFile) return;

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Process annotations for each page
        for (const [pageIndexStr, pageAnnotations] of Object.entries(annotations)) {
          const pageIndex = parseInt(pageIndexStr);
          const page = pdfDoc.getPage(pageIndex);
          const { width, height } = page.getSize();

          // Determine scale from preview (uses the same constant as viewer)
          const viewWidth = width * PDF_PREVIEW_SCALE;
          const viewHeight = height * PDF_PREVIEW_SCALE;
          const scaleX = width / viewWidth;
          const scaleY = height / viewHeight;

          // Helper to parse hex color strings like #RRGGBB
          const hexToRgb = (hex: string) => {
            const c = /^#([0-9a-fA-F]{6})$/.test(hex) ? hex : '#000000';
            const r = parseInt(c.slice(1, 3), 16) / 255;
            const g = parseInt(c.slice(3, 5), 16) / 255;
            const b = parseInt(c.slice(5, 7), 16) / 255;
            return { r, g, b };
          };

          // Helper to embed image supporting PNG/JPEG/SVG data URLs
          const embedImage = async (dataUrl: string) => {
            if (dataUrl.startsWith('data:image/png')) return await pdfDoc.embedPng(dataUrl);
            if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return await pdfDoc.embedJpg(dataUrl);
            if (dataUrl.startsWith('data:image/svg')) {
              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = dataUrl;
              });
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, img.width);
              canvas.height = Math.max(1, img.height);
              const ctx = canvas.getContext('2d');
              if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const pngUrl = canvas.toDataURL('image/png');
              return await pdfDoc.embedPng(pngUrl);
            }
            return await pdfDoc.embedPng(dataUrl);
          };

          for (const annotation of pageAnnotations as any[]) {
            if (annotation.type === 'text' && annotation.text) {
              const colorHex = annotation.color || '#000000';
              const { r, g, b } = hexToRgb(colorHex);
              const size = annotation.effectiveFontSize || annotation.fontSize || 20;

              page.drawText(annotation.text, {
                x: (annotation.x || 0) * scaleX,
                // Convert from top-left to bottom-left using bounding height for perfect alignment
                y: height - (annotation.y || 0) * scaleY - (annotation.height || size) * scaleY,
                size,
                color: rgb(r, g, b),
              });
            } else if (annotation.imageData) {
              try {
                const img = await embedImage(annotation.imageData);
                page.drawImage(img, {
                  x: (annotation.x || 0) * scaleX,
                  y: height - (annotation.y || 0) * scaleY - (annotation.height || 0) * scaleY,
                  width: (annotation.width || 0) * scaleX,
                  height: (annotation.height || 0) * scaleY,
                  rotate: degrees(-(annotation.rotation || 0)),
                });
              } catch (e) {
                console.warn('Failed to embed image annotation, skipping', e);
              }
            }
          }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `edited_${pdfFile.name}`;
        link.click();

        toast.success("Edited PDF downloaded!");
      } catch (error) {
        console.error("Failed to save PDF:", error);
        toast.error("Failed to save edited PDF");
      }
    },

    handleDownload: () => {
      if (!pdfFile) return;
      
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = pdfFile.name;
      link.click();
      toast.success("Downloaded!");
    },

    handleClear: () => {
      setPdfFile(null);
      setPdfUrl("");
      setPdfDimensions(null);
      setTotalPages(0);
      setIsLoading(false);
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      pdfFile,
      pdfUrl,
      pdfDimensions,
      totalPages,
      isLoading,
      fileInputRef,
    },
    setters: {
      setPdfFile,
      setPdfUrl,
      setPdfDimensions,
      setTotalPages,
      setIsLoading,
    },
    helpers: {},
    actions,
  };
};
