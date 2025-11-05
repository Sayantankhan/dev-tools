import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export const PDFEditorStateHandler = (): ToolHandler => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      pdfFile,
      pdfUrl,
      fileInputRef,
    },
    setters: {
      setPdfFile,
      setPdfUrl,
    },
    helpers: {},
    actions,
  };
};
