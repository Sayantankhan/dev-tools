import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Download, Trash2, Image as ImageIcon } from "lucide-react";

export const ImageTool = () => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const handleConvert = async () => {
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
  };

  const handleDownload = () => {
    if (!convertedImage) return;

    const a = document.createElement("a");
    a.href = convertedImage;
    a.download = `converted-${Date.now()}.${convertToJPEG ? "jpg" : "png"}`;
    a.click();

    toast.success("Image downloaded!");
  };

  const handleClear = () => {
    setFile(null);
    setPreview("");
    setConvertedImage("");
    setOriginalSize(0);
    setConvertedSize(0);
    setWidth(800);
    setHeight(0);
    setQuality(85);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-foreground font-medium mb-2">
          Drop an image here or click to browse
        </p>
        <p className="text-sm text-muted-foreground">
          PNG, JPEG, WEBP, GIF, TIFF supported • Max 25MB
        </p>
      </div>

      {preview && (
        <>
          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Height (px) {keepAspectRatio && "(auto)"}</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  disabled={keepAspectRatio}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aspect-ratio"
                  checked={keepAspectRatio}
                  onCheckedChange={(checked) => setKeepAspectRatio(checked as boolean)}
                />
                <Label htmlFor="aspect-ratio" className="cursor-pointer">
                  Keep aspect ratio
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quality: {quality}%</Label>
                <Slider
                  value={[quality]}
                  onValueChange={(values) => setQuality(values[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="convert-jpeg"
                  checked={convertToJPEG}
                  onCheckedChange={(checked) => setConvertToJPEG(checked as boolean)}
                />
                <Label htmlFor="convert-jpeg" className="cursor-pointer">
                  Convert to JPEG
                </Label>
              </div>

              <div className="pt-4">
                <Button onClick={handleConvert} disabled={processing} className="btn-gradient w-full">
                  {processing ? (
                    "Processing..."
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Convert Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Original ({originalDimensions.width}×{originalDimensions.height})</Label>
              <div className="bg-input rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                <img src={preview} alt="Original" className="max-w-full max-h-[400px] object-contain" />
              </div>
              <p className="text-sm text-muted-foreground">
                Size: {formatFileSize(originalSize)}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Converted</Label>
              <div className="bg-input rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {convertedImage ? (
                  <img src={convertedImage} alt="Converted" className="max-w-full max-h-[400px] object-contain" />
                ) : (
                  <p className="text-muted-foreground">Click "Convert Image" to see result</p>
                )}
              </div>
              {convertedImage && (
                <>
                  <p className="text-sm text-success">
                    Size: {formatFileSize(convertedSize)} (
                    {((1 - convertedSize / originalSize) * 100).toFixed(1)}% smaller)
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={handleClear} variant="outline">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
