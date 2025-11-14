import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

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

    handleDownloadEdited: async (annotationsCanvas: any) => {
      if (!pdfFile) return;

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const firstPage = pdfDoc.getPage(0);

        // Export canvas as PNG
        const canvasDataUrl = annotationsCanvas.toDataURL("image/png");
        const pngImage = await pdfDoc.embedPng(canvasDataUrl);

        const { width, height } = firstPage.getSize();
        
        // Draw the annotations on top of the PDF
        firstPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width,
          height,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
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
