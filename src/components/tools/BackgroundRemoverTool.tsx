import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, Scissors } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

export const BackgroundRemoverTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    setSelectedFile(file);
    setProcessedImage(null);
  };

  const removeBackground = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    toast.info("Loading AI model... This may take a moment");
    
    try {
      const segmenter = await pipeline('image-segmentation', 'Xenova/modnet', {
        device: 'webgpu',
      });
      
      const img = new Image();
      const url = URL.createObjectURL(selectedFile);
      
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          toast.error("Failed to create canvas");
          URL.revokeObjectURL(url);
          setIsProcessing(false);
          return;
        }
        
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        toast.info("Processing image...");
        
        const result = await segmenter(canvas.toDataURL('image/png'));
        
        if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
          throw new Error('Invalid segmentation result');
        }
        
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');
        
        if (!outputCtx) throw new Error('Could not get output canvas context');
        
        outputCtx.drawImage(canvas, 0, 0);
        
        const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        const data = outputImageData.data;
        
        for (let i = 0; i < result[0].mask.data.length; i++) {
          const alpha = Math.round(result[0].mask.data[i] * 255);
          data[i * 4 + 3] = alpha;
        }
        
        outputCtx.putImageData(outputImageData, 0, 0);
        
        outputCanvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            setProcessedImage(pngUrl);
            toast.success("Background removed!");
            setIsProcessing(false);
          }
        }, 'image/png', 1.0);
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        toast.error("Failed to load image");
        URL.revokeObjectURL(url);
        setIsProcessing(false);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error("Failed to remove background");
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const a = document.createElement('a');
    a.href = processedImage;
    a.download = selectedFile?.name.replace(/\.[^.]+$/, '-no-bg.png') || 'no-background.png';
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Background Remover (AI)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Select Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                <Upload className="w-4 h-4 mr-2" />
                Select Image
              </Button>
              {selectedFile && (
                <span className="flex items-center text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>
          
          {selectedFile && !processedImage && (
            <Button onClick={removeBackground} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Remove Background"}
            </Button>
          )}
          
          {processedImage && (
            <div className="space-y-3">
              <div className="bg-checkered rounded-lg p-4">
                <img src={processedImage} alt="Processed" className="max-w-full" />
              </div>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
