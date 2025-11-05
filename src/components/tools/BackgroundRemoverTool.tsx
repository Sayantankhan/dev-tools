import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Scissors } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

export const BackgroundRemoverTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maskData, setMaskData] = useState<any>(null);
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [bgRemovalIntensity, setBgRemovalIntensity] = useState([100]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
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
        
        // Store mask and canvas for later adjustments
        setMaskData(result[0].mask.data);
        setOriginalCanvas(canvas);
        
        applyMask(canvas, result[0].mask.data, 100);
        
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

  const applyMask = (canvas: HTMLCanvasElement, mask: any, intensity: number) => {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) return;
    
    outputCtx.drawImage(canvas, 0, 0);
    
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    const intensityFactor = intensity / 100;
    
    for (let i = 0; i < mask.length; i++) {
      const maskValue = mask[i];
      const alpha = Math.round(maskValue * 255 * intensityFactor + (1 - intensityFactor) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    
    outputCanvas.toBlob((blob) => {
      if (blob) {
        const pngUrl = URL.createObjectURL(blob);
        if (processedImage) {
          URL.revokeObjectURL(processedImage);
        }
        setProcessedImage(pngUrl);
        if (intensity === 100) {
          toast.success("Background removed!");
        }
        setIsProcessing(false);
      }
    }, 'image/png', 1.0);
  };

  useEffect(() => {
    if (maskData && originalCanvas) {
      applyMask(originalCanvas, maskData, bgRemovalIntensity[0]);
    }
  }, [bgRemovalIntensity]);

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedImage(null);
    setMaskData(null);
    setOriginalCanvas(null);
    setBgRemovalIntensity([100]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDone = () => {
    if (!processedImage) return;
    const a = document.createElement('a');
    a.href = processedImage;
    a.download = selectedFile?.name.replace(/\.[^.]+$/, '-no-bg.png') || 'no-background.png';
    a.click();
    toast.success("Image downloaded!");
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
          {!previewUrl ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card border rounded-lg p-4">
                <img 
                  src={processedImage || previewUrl} 
                  alt="Preview" 
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                  style={{ backgroundColor: processedImage ? 'transparent' : 'white' }}
                />
              </div>
              
              {!processedImage && (
                <Button 
                  onClick={removeBackground} 
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? "Processing..." : "Remove Background"}
                </Button>
              )}
              
              {processedImage && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Remove background</span>
                    <Slider
                      value={bgRemovalIntensity}
                      onValueChange={setBgRemovalIntensity}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleClear} 
                  variant="outline"
                  className="flex-1"
                >
                  Clear
                </Button>
                {processedImage && (
                  <Button 
                    onClick={handleDone}
                    className="flex-1"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};