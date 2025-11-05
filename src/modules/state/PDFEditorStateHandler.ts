import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

export const PDFEditorStateHandler = (): ToolHandler => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    clearCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
  };

  const actions = {
    handlePDFUpload: (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }

      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      toast.success("PDF uploaded successfully");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
    },

    draw: (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    },

    stopDrawing: () => {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureDataUrl(canvas.toDataURL());
      }
    },

    handleClearSignature: () => {
      helpers.clearCanvas();
      setSignatureDataUrl("");
      toast.success("Signature cleared");
    },

    handleApplySignature: async () => {
      if (!pdfFile) {
        toast.error("Please upload a PDF first");
        return;
      }

      if (!signatureDataUrl) {
        toast.error("Please draw a signature first");
        return;
      }

      try {
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        
        const signatureWidth = 150;
        const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;
        
        lastPage.drawImage(signatureImage, {
          x: lastPage.getWidth() - signatureWidth - 50,
          y: 50,
          width: signatureWidth,
          height: signatureHeight,
        });

        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `signed_${pdfFile.name}`;
        link.click();
        
        toast.success("PDF signed and downloaded!");
      } catch (error) {
        console.error(error);
        toast.error("Failed to apply signature");
      }
    },

    handleClear: () => {
      setPdfFile(null);
      setPdfUrl("");
      setSignatureDataUrl("");
      helpers.clearCanvas();
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      pdfFile,
      pdfUrl,
      signatureDataUrl,
      isDrawing,
      canvasRef,
      fileInputRef,
    },
    setters: {
      setPdfFile,
      setPdfUrl,
      setSignatureDataUrl,
      setIsDrawing,
    },
    helpers,
    actions,
  };
};
