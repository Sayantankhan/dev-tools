import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const PDFGeneratorStateHandler = (): ToolHandler => {
  const [textContent, setTextContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageFileNames, setImageFileNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState("document.pdf");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const helpers = {
    validateFileName: (name: string): string => {
      const cleaned = name.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
      return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
    },

    detectFormat : (dataUrlOrSrc: string) => {
      if (!dataUrlOrSrc || typeof dataUrlOrSrc !== "string") return "JPEG";
      if (dataUrlOrSrc.startsWith("data:image/png")) return "PNG";
      if (dataUrlOrSrc.startsWith("data:image/jpeg") || dataUrlOrSrc.startsWith("data:image/jpg")) return "JPEG";
      if (dataUrlOrSrc.startsWith("data:image/webp")) return "WEBP";
      // fallback
      return "JPEG";
    },
  };

  const actions = {
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const readers: Promise<string>[] = [];
      const newFileNames: string[] = [];

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          return;
        }

        newFileNames.push(file.name);
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        });
        readers.push(promise);
      });

      Promise.all(readers).then((results) => {
        setImages((prev) => [...prev, ...results]);
        setImageFileNames((prev) => [...prev, ...newFileNames]);
        toast.success(`Added ${results.length} image(s)`);
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },

    handleRemoveImage: (index: number) => {
      setImages((prev) => prev.filter((_, i) => i !== index));
      setImageFileNames((prev) => prev.filter((_, i) => i !== index));
      toast.success("Image removed");
    },

    handleGeneratePDF: async () => {
      if (!textContent.trim() && images.length === 0) {
        toast.error("Please add text or images to generate PDF");
        return;
      }

      try {
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        let yPosition = 20;

        // Add text content
        if (textContent.trim()) {
          const lines = doc.splitTextToSize(textContent, 170);
          lines.forEach((line: string) => {
            if (yPosition > 280) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, 20, yPosition);
            yPosition += 7;
          });
        }

        // Add images
        for (const imgData of images) {
          const img = new Image();
          const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Image failed to load"));
          });
          img.src = imgData;
          
          await loadPromise;

          // Calculate proportional dimensions that fit the page
          const maxWidth = 170; // Max width for A4 with margins
          const maxHeight = 240; // Max height to avoid overflow
          const imgAspectRatio = img.width / img.height;
          
          let imgWidth = maxWidth;
          let imgHeight = imgWidth / imgAspectRatio;
          
          // If height exceeds max, scale down based on height instead
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          // Check if we need a new page
          if (yPosition + imgHeight > 280) {
            doc.addPage();
            yPosition = 20;
          }

          const format = helpers.detectFormat(imgData);
          doc.addImage(imgData, format, 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        }

        const validFileName = helpers.validateFileName(fileName);
        doc.save(validFileName);
        toast.success(`PDF generated: ${validFileName}`);
      } catch (error) {
        toast.error("Failed to generate PDF");
      }
    },

    handleClear: () => {
      setTextContent("");
      setImages([]);
      setImageFileNames([]);
      setFileName("document.pdf");
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      textContent,
      images,
      imageFileNames,
      fileName,
      fileInputRef,
    },
    setters: {
      setTextContent,
      setImages,
      setImageFileNames,
      setFileName,
    },
    helpers,
    actions,
  };
};
