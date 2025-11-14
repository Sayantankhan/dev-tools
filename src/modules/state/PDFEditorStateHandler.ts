import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import { PDFDocument, rgb, degrees } from "pdf-lib";

export const PDFEditorStateHandler = (): ToolHandler => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actions = {
    handlePDFUpload: async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }

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
      } catch (error) {
        console.error("Failed to get PDF dimensions:", error);
      }

      toast.success("PDF uploaded successfully");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    handleDownloadEdited: async (annotations: any, dimensions: any) => {
      if (!pdfFile) return;

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Process annotations for each page
        for (const [pageIndexStr, pageAnnotations] of Object.entries(annotations)) {
          const pageIndex = parseInt(pageIndexStr);
          const page = pdfDoc.getPage(pageIndex);
          const { width, height } = page.getSize();

          // Determine scale from viewer to PDF units if provided
          const viewWidth = (dimensions && (dimensions.width || (dimensions[pageIndex]?.width))) || width;
          const viewHeight = (dimensions && (dimensions.height || (dimensions[pageIndex]?.height))) || height;
          const scaleX = width / (viewWidth || width);
          const scaleY = height / (viewHeight || height);

          // Helper to parse hex color strings like #RRGGBB
          const hexToRgb = (hex: string) => {
            const c = hex.startsWith('#') ? hex : '#000000';
            const r = parseInt(c.slice(1, 3), 16) / 255;
            const g = parseInt(c.slice(3, 5), 16) / 255;
            const b = parseInt(c.slice(5, 7), 16) / 255;
            return { r, g, b };
          };

          // Helper to embed image supporting PNG/JPEG/SVG data URLs
          const embedImage = async (dataUrl: string) => {
            if (dataUrl.startsWith('data:image/png')) {
              return await pdfDoc.embedPng(dataUrl);
            }
            if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
              return await pdfDoc.embedJpg(dataUrl);
            }
            if (dataUrl.startsWith('data:image/svg')) {
              // Rasterize SVG to PNG using canvas
              const img = new Image();
              const loaded: Promise<HTMLImageElement> = new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = reject;
              });
              img.src = dataUrl;
              const el = await loaded;
              const canvas = document.createElement('canvas');
              // Use target size in PDF units converted back to CSS px scale (approx)
              canvas.width = Math.max(1, Math.floor((el.width || 1)));
              canvas.height = Math.max(1, Math.floor((el.height || 1)));
              const ctx = canvas.getContext('2d');
              if (ctx) ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
              const pngUrl = canvas.toDataURL('image/png');
              return await pdfDoc.embedPng(pngUrl);
            }
            // Fallback try PNG
            return await pdfDoc.embedPng(dataUrl);
          };

          for (const annotation of pageAnnotations as any[]) {
            if (annotation.type === 'text' && annotation.text) {
              const colorHex = annotation.color || '#000000';
              const { r, g, b } = hexToRgb(colorHex);
              const size = annotation.fontSize || 20;

              page.drawText(annotation.text, {
                x: (annotation.x || 0) * scaleX,
                // pdf-lib uses baseline from bottom-left. Convert top-left to baseline using font size
                y: height - (annotation.y || 0) * scaleY - size,
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
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      pdfFile,
      pdfUrl,
      pdfDimensions,
      totalPages,
      fileInputRef,
    },
    setters: {
      setPdfFile,
      setPdfUrl,
      setPdfDimensions,
      setTotalPages,
    },
    helpers: {},
    actions,
  };
};
