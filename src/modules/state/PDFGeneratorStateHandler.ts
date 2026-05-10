import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";

export type PdfSourceKind = "image" | "text" | "pdf";

export interface PdfSourceItem {
  id: string;
  name: string;
  kind: PdfSourceKind;
  // image: data URL; text: extracted text; pdf: ArrayBuffer
  data: string | ArrayBuffer;
  preview?: string; // for images
  /** When true, render on the same page as the previous item instead of starting a new page */
  samePageAsPrevious?: boolean;
}

const TEXT_EXTS = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "html", "htm", "xml", "yml", "yaml", "js", "ts", "tsx", "jsx", "css", "py", "sh"];

const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const readAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });

const readAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });

export const PDFGeneratorStateHandler = (): ToolHandler => {
  const [textContent, setTextContent] = useState("");
  const [items, setItems] = useState<PdfSourceItem[]>([]);
  const [fileName, setFileName] = useState("document.pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    validateFileName: (name: string): string => {
      const cleaned = name.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
      return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
    },
    detectImageFormat: (dataUrl: string) => {
      if (dataUrl.startsWith("data:image/png")) return "PNG";
      if (dataUrl.startsWith("data:image/webp")) return "WEBP";
      return "JPEG";
    },
  };

  const classify = async (file: File): Promise<PdfSourceItem | null> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (file.type.startsWith("image/")) {
      const data = await readAsDataURL(file);
      return { id, name: file.name, kind: "image", data, preview: data };
    }
    if (file.type === "application/pdf" || ext === "pdf") {
      const data = await readAsArrayBuffer(file);
      return { id, name: file.name, kind: "pdf", data };
    }
    if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buf = await readAsArrayBuffer(file);
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return { id, name: file.name, kind: "text", data: result.value };
    }
    if (file.type.startsWith("text/") || TEXT_EXTS.includes(ext)) {
      const data = await readAsText(file);
      return { id, name: file.name, kind: "text", data };
    }
    toast.error(`Unsupported file: ${file.name}`);
    return null;
  };

  const actions = {
    handleImageUpload: async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      try {
        const results = await Promise.all(Array.from(files).map(classify));
        const valid = results.filter((r): r is PdfSourceItem => r !== null);
        if (valid.length > 0) {
          setItems((prev) => [...prev, ...valid]);
          toast.success(`Added ${valid.length} file(s)`);
        }
      } catch (e) {
        toast.error("Failed to read one or more files");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },

    handleRemoveImage: (index: number) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
    },

    handleMoveItem: (index: number, dir: -1 | 1) => {
      setItems((prev) => {
        const next = [...prev];
        const target = index + dir;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },

    handleGeneratePDF: async () => {
      if (!textContent.trim() && items.length === 0) {
        toast.error("Please add text or files to generate PDF");
        return;
      }

      setIsGenerating(true);
      try {
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        let y = margin;
        let firstContent = true;

        const ensureSpace = (needed: number) => {
          if (y + needed > pageH - margin) {
            doc.addPage();
            y = margin;
          }
        };

        const writeText = (text: string) => {
          if (!text) return;
          const lines = doc.splitTextToSize(text, maxW) as string[];
          for (const line of lines) {
            ensureSpace(7);
            doc.text(line, margin, y);
            y += 7;
          }
        };

        const addImage = async (dataUrl: string) => {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = dataUrl;
          });
          const ar = img.width / img.height;
          let w = maxW;
          let h = w / ar;
          if (h > maxH) {
            h = maxH;
            w = h * ar;
          }
          ensureSpace(h);
          doc.addImage(dataUrl, helpers.detectImageFormat(dataUrl), margin, y, w, h);
          y += h + 8;
        };

        // Free-form text first
        if (textContent.trim()) {
          writeText(textContent);
          firstContent = false;
        }

        // Collect PDFs separately to merge at end via pdf-lib
        const pdfBuffers: ArrayBuffer[] = [];

        for (const item of items) {
          if (item.kind === "pdf") {
            pdfBuffers.push(item.data as ArrayBuffer);
            continue;
          }

          // Decide whether to start a new page for this item
          if (!firstContent && !item.samePageAsPrevious) {
            doc.addPage();
            y = margin;
          } else if (!firstContent) {
            // Same-page grouping: just add a small gap
            y += 4;
          }

          if (item.kind === "image") {
            await addImage(item.data as string);
          } else if (item.kind === "text") {
            ensureSpace(8);
            doc.setFont("helvetica", "bold");
            doc.text(item.name, margin, y);
            y += 8;
            doc.setFont("helvetica", "normal");
            writeText(item.data as string);
          }
          firstContent = false;
        }

        // Get jsPDF output then merge any PDFs onto the end with pdf-lib
        const baseBytes = doc.output("arraybuffer");
        let finalBytes: Uint8Array;

        if (pdfBuffers.length > 0) {
          const merged = await PDFDocument.load(baseBytes);
          for (const buf of pdfBuffers) {
            const src = await PDFDocument.load(buf);
            const pages = await merged.copyPages(src, src.getPageIndices());
            pages.forEach((p) => merged.addPage(p));
          }
          finalBytes = await merged.save();
        } else {
          finalBytes = new Uint8Array(baseBytes);
        }

        const validFileName = helpers.validateFileName(fileName);
        const blob = new Blob([finalBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = validFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success(`PDF generated: ${validFileName}`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate PDF");
      } finally {
        setIsGenerating(false);
      }
    },

    handleClear: () => {
      setTextContent("");
      setItems([]);
      setFileName("document.pdf");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      textContent,
      items,
      // Back-compat aliases (in case anything still reads these)
      images: items.filter((i) => i.kind === "image").map((i) => i.preview ?? ""),
      imageFileNames: items.map((i) => i.name),
      fileName,
      fileInputRef,
      isGenerating,
    },
    setters: {
      setTextContent,
      setItems,
      setFileName,
    },
    helpers,
    actions,
  };
};
