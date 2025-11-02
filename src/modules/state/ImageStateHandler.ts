import { useState, useRef } from "react";
import { toast } from "sonner";
import { ToolHandler } from "@/modules/types/ToolHandler";

export const ImageStateHandler = (): ToolHandler => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");
    const [width, setWidth] = useState<number>(800);
    const [height, setHeight] = useState<number>(0);
    const [quality, setQuality] = useState<number>(85);
    const [keepAspectRatio, setKeepAspectRatio] = useState(true);
    const [convertToJPEG, setConvertToJPEG] = useState(true);
    const [convertedImage, setConvertedImage] = useState<string>("");
    const [originalSize, setOriginalSize] = useState<number>(0);
    const [convertedSize, setConvertedSize] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });

    const helpers = {
        formatFileSize: (bytes: number) => {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
        }
    }

    const actions = {
        handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0];
            if (!selectedFile) return;

            // Check file size (25MB limit)
            if (selectedFile.size > 25 * 1024 * 1024) {
                toast.error("File too large", {
                    description: "Maximum file size is 25MB",
                });
                return;
            }

            setFile(selectedFile);
            setFileName(selectedFile.name);
            setOriginalSize(selectedFile.size);

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setOriginalDimensions({ width: img.width, height: img.height });
                    setWidth(img.width);
                    setHeight(img.height);
                };
                img.src = event.target?.result as string;
                setPreview(event.target?.result as string);
            };
            reader.readAsDataURL(selectedFile);

            toast.success("Image loaded!");
        },

        handleDrop: (e: React.DragEvent) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile && droppedFile.type.startsWith("image/")) {
                const fakeEvent = {
                    target: { files: [droppedFile] },
                } as any;
                actions.handleFileSelect(fakeEvent);
            }
        },

        handleConvert: async () => {
            if (!file || !preview) return;

            setProcessing(true);

            try {
                const img = new Image();
                img.src = preview;

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) throw new Error("Could not get canvas context");

                let targetWidth = width;
                let targetHeight = height;

                if (keepAspectRatio && height === 0) {
                    const aspectRatio = img.height / img.width;
                    targetHeight = Math.round(targetWidth * aspectRatio);
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight || img.height;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const outputFormat = convertToJPEG ? "image/jpeg" : file.type;
                const outputQuality = quality / 100;

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            setConvertedImage(url);
                            setConvertedSize(blob.size);
                            setProcessing(false);
                            toast.success("Image converted!", {
                                description: `Size reduced by ${((1 - blob.size / originalSize) * 100).toFixed(1)}%`,
                            });
                        }
                    },
                    outputFormat,
                    outputQuality
                );
            } catch (error: any) {
                setProcessing(false);
                toast.error("Conversion failed", {
                    description: error.message,
                });
            }
        },

        handleDownload: () => {
            if (!convertedImage) return;

            const a = document.createElement("a");
            a.href = convertedImage;
            a.download = `converted-${Date.now()}.${convertToJPEG ? "jpg" : "png"}`;
            a.click();

            toast.success("Image downloaded!");
        },

        handleClear: () => {
            setFile(null);
            setPreview("");
            setConvertedImage("");
            setOriginalSize(0);
            setConvertedSize(0);
            setWidth(800);
            setHeight(0);
            setQuality(85);
            setFileName("");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
    }

    return {
        state: {
            file,
            preview,
            width,
            height,
            quality,
            keepAspectRatio,
            convertToJPEG,
            convertedImage,
            originalSize,
            convertedSize,
            processing,
            fileName,
            fileInputRef,
            originalDimensions
        },
        setters: {
            setWidth,
            setHeight,
            setKeepAspectRatio,
            setQuality,
            setConvertToJPEG,
            setFileName
        },
        helpers,
        actions
    }
}