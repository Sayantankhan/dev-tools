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
    const [cropMode, setCropMode] = useState(false);
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
    const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'gif'>('png');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [blur, setBlur] = useState(0);
    const [grayscale, setGrayscale] = useState(false);

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

                // Apply filters
                ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px) ${grayscale ? 'grayscale(100%)' : ''}`;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const mimeType = `image/${outputFormat}`;
                const outputQuality = quality / 100;

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            setConvertedImage(url);
                            setConvertedSize(blob.size);
                            // Update preview to current state for next operation
                            setPreview(url);
                            setOriginalDimensions({ width: targetWidth, height: targetHeight || img.height });
                            setWidth(targetWidth);
                            setHeight(targetHeight || img.height);
                            setProcessing(false);
                            toast.success("Image converted!", {
                                description: `Size reduced by ${((1 - blob.size / originalSize) * 100).toFixed(1)}%`,
                            });
                        }
                    },
                    mimeType,
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
            const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
            a.download = `converted-${Date.now()}.${ext}`;
            a.click();

            toast.success("Image downloaded!");
        },

        handleCrop: async () => {
            if (!preview || !cropArea.width || !cropArea.height) {
                toast.error("Please select a crop area");
                return;
            }

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

                canvas.width = cropArea.width;
                canvas.height = cropArea.height;

                ctx.drawImage(
                    img,
                    cropArea.x,
                    cropArea.y,
                    cropArea.width,
                    cropArea.height,
                    0,
                    0,
                    cropArea.width,
                    cropArea.height
                );

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            setConvertedImage(url);
                            setConvertedSize(blob.size);
                            // Update preview to current state for next operation
                            setPreview(url);
                            setOriginalDimensions({ width: cropArea.width, height: cropArea.height });
                            setWidth(cropArea.width);
                            setHeight(cropArea.height);
                            setCropMode(false);
                            setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                            setProcessing(false);
                            toast.success("Image cropped!");
                        }
                    },
                    "image/png",
                    1.0
                );
            } catch (error: any) {
                setProcessing(false);
                toast.error("Crop failed", {
                    description: error.message,
                });
            }
        },

        handleRemoveWatermark: async () => {
            if (!preview) return;

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

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                // Simple watermark removal - blur bottom region (common watermark area)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Apply a simple blur to bottom 15% of image
                const watermarkRegionStart = Math.floor(canvas.height * 0.85);
                
                for (let y = watermarkRegionStart; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const idx = (y * canvas.width + x) * 4;
                        
                        // Average with surrounding pixels for blur effect
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const ny = y + dy;
                                const nx = x + dx;
                                if (ny >= 0 && ny < canvas.height && nx >= 0 && nx < canvas.width) {
                                    const nIdx = (ny * canvas.width + nx) * 4;
                                    r += data[nIdx];
                                    g += data[nIdx + 1];
                                    b += data[nIdx + 2];
                                    count++;
                                }
                            }
                        }
                        
                        data[idx] = r / count;
                        data[idx + 1] = g / count;
                        data[idx + 2] = b / count;
                    }
                }

                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            setConvertedImage(url);
                            setConvertedSize(blob.size);
                            // Update preview to current state for next operation
                            setPreview(url);
                            setProcessing(false);
                            toast.success("Watermark removal attempted!", {
                                description: "Bottom region blurred"
                            });
                        }
                    },
                    "image/png",
                    1.0
                );
            } catch (error: any) {
                setProcessing(false);
                toast.error("Watermark removal failed", {
                    description: error.message,
                });
            }
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
            setCropMode(false);
            setCropArea({ x: 0, y: 0, width: 0, height: 0 });
            setBrightness(100);
            setContrast(100);
            setBlur(0);
            setGrayscale(false);
            setOutputFormat('png');
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
            cropMode,
            cropArea,
            fileInputRef,
            originalDimensions,
            outputFormat,
            brightness,
            contrast,
            blur,
            grayscale
        },
        setters: {
            setWidth,
            setHeight,
            setKeepAspectRatio,
            setQuality,
            setConvertToJPEG,
            setFileName,
            setCropMode,
            setCropArea,
            setOutputFormat,
            setBrightness,
            setContrast,
            setBlur,
            setGrayscale
        },
        helpers,
        actions
    }
}