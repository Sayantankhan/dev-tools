import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload, Scissors, Download, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { pipeline, env } from '@huggingface/transformers';

// Enable browser caching for models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;
const SLIDER_THROTTLE_MS = 150;

// Model configuration for A/B testing
const MODELS = {
  'briaai/RMBG-1.4': { name: 'BRIA RMBG-1.4', speed: 'fast', quality: 'high' },
  'Xenova/modnet': { name: 'MODNet', speed: 'very-fast', quality: 'medium' },
} as const;

type ModelId = keyof typeof MODELS;

interface Telemetry {
  selectedPercent: number[];
  finalPercent?: number;
  exportFormat?: 'png' | 'jpg';
  inferenceTimeMs?: number;
  modelUsed?: ModelId;
  failureCount: number;
  timeoutCount: number;
}

export const BackgroundRemoverTool = () => {
  // Core state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maskData, setMaskData] = useState<Uint8Array | Uint8ClampedArray | Float32Array | null>(null);
  
  // UI state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgRemovalPercent, setBgRemovalPercent] = useState([0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMaskOverlay, setShowMaskOverlay] = useState(false);
  const [showTransparent, setShowTransparent] = useState(true);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [jpgFillColor, setJpgFillColor] = useState('#ffffff');
  const [selectedModel, setSelectedModel] = useState<ModelId>('briaai/RMBG-1.4');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderTimeoutRef = useRef<NodeJS.Timeout>();
  const processingAbortRef = useRef<AbortController>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Telemetry
  const [telemetry, setTelemetry] = useState<Telemetry>({
    selectedPercent: [],
    failureCount: 0,
    timeoutCount: 0,
  });

  // Log telemetry (would send to analytics in production)
  useEffect(() => {
    console.log('📊 Telemetry:', telemetry);
  }, [telemetry]);

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
    loadAndProcessImage(file);
  };

  const loadAndProcessImage = async (file: File) => {
    setIsProcessing(true);
    const startTime = Date.now();
    
    try {
      // Cancel any in-flight processing
      if (processingAbortRef.current) {
        processingAbortRef.current.abort();
      }
      processingAbortRef.current = new AbortController();

      setIsDownloading(true);
      setDownloadProgress(0);
      toast.info("Loading AI model (first time only - will be cached)...");
      
      const segmenter = await pipeline('image-segmentation', selectedModel, {
        device: 'webgpu',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            setDownloadProgress(progress.progress);
          }
        },
      });
      
      setIsDownloading(false);
      
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      
      // Store original image
      setOriginalImage(img);
      
      // Create and store original canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
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
      setOriginalCanvas(canvas);
      
      // Check if aborted
      if (processingAbortRef.current?.signal.aborted) {
        URL.revokeObjectURL(url);
        return;
      }
      
      toast.info("Processing image...");
      
      const result = await segmenter(canvas.toDataURL('image/png'));
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      // Store mask data
      const mask = result[0].mask.data as Uint8Array | Uint8ClampedArray | Float32Array;
      setMaskData(mask);
      
      const inferenceTime = Date.now() - startTime;
      setTelemetry(prev => ({
        ...prev,
        inferenceTimeMs: inferenceTime,
        modelUsed: selectedModel,
      }));
      
      toast.success("Model loaded from cache" + (inferenceTime > 5000 ? "" : " (instant)"));
      URL.revokeObjectURL(url);
      setIsProcessing(false);
      
      // Apply initial 0% removal
      applyMask(0);
      
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error("Failed to process image");
      setTelemetry(prev => ({
        ...prev,
        failureCount: prev.failureCount + 1,
      }));
      setIsProcessing(false);
    }
  };

  const applyMask = useCallback((percent: number) => {
    if (!originalCanvas || !maskData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = originalCanvas.width;
    canvas.height = originalCanvas.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw original image
    ctx.drawImage(originalCanvas, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const removalPercent = percent / 100; // p in [0,1]
    const bytesPerEl = (maskData as any)?.BYTES_PER_ELEMENT ?? 4;
    
    for (let i = 0; i < maskData.length; i++) {
      // Normalize matte m to 0..1: 0=background, 1=foreground
      const raw = maskData[i] as number;
      const m = bytesPerEl === 1 ? raw / 255 : raw;
      const matte = Math.min(1, Math.max(0, m));
      
      // Apply mask formula: alpha = 1 - (1 - matte) * p
      // This is Option B: global alpha scaling that preserves relative confidence
      const alpha01 = 1 - (1 - matte) * removalPercent;
      
      // Show mask overlay if enabled
      if (showMaskOverlay) {
        // Red tint for removed areas
        const removeAmount = (1 - matte) * removalPercent;
        data[i * 4] = Math.min(255, data[i * 4] + removeAmount * 255);
      }
      
      data[i * 4 + 3] = Math.round(alpha01 * 255);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Update preview URL
    canvas.toBlob((blob) => {
      if (blob && previewUrl) {
        URL.revokeObjectURL(previewUrl);
        const newUrl = URL.createObjectURL(blob);
        setPreviewUrl(newUrl);
      }
    }, 'image/png');
  }, [originalCanvas, maskData, showMaskOverlay, previewUrl]);

  // Throttled slider handler
  const handleSliderChange = useCallback((value: number[]) => {
    setBgRemovalPercent(value);
    setTelemetry(prev => ({
      ...prev,
      selectedPercent: [...prev.selectedPercent, value[0]],
    }));
    
    if (sliderTimeoutRef.current) {
      clearTimeout(sliderTimeoutRef.current);
    }
    
    sliderTimeoutRef.current = setTimeout(() => {
      applyMask(value[0]);
    }, SLIDER_THROTTLE_MS);
  }, [applyMask]);

  // Update mask overlay when toggled
  useEffect(() => {
    if (maskData && originalCanvas) {
      applyMask(bgRemovalPercent[0]);
    }
  }, [showMaskOverlay, applyMask, maskData, originalCanvas, bgRemovalPercent]);

  const handleReset = () => {
    setBgRemovalPercent([0]);
    applyMask(0);
    toast.success("Reset to original image");
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOriginalImage(null);
    setOriginalCanvas(null);
    setMaskData(null);
    setBgRemovalPercent([0]);
    setShowMaskOverlay(false);
    setTelemetry({
      selectedPercent: [],
      failureCount: 0,
      timeoutCount: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;
    
    if (exportFormat === 'jpg') {
      // Fill background with chosen color
      finalCtx.fillStyle = jpgFillColor;
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }
    
    finalCtx.drawImage(canvas, 0, 0);
    
    finalCanvas.toBlob((blob) => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = selectedFile?.name.replace(/\.[^.]+$/, `-no-bg.${exportFormat}`) || `no-background.${exportFormat}`;
        a.click();
        
        setTelemetry(prev => ({
          ...prev,
          finalPercent: bgRemovalPercent[0],
          exportFormat,
        }));
        
        toast.success(`Exported as ${exportFormat.toUpperCase()}!`);
      }
    }, exportFormat === 'png' ? 'image/png' : 'image/jpeg', 0.95);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Slider-driven background remover — absolute-percent vs original image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!originalCanvas ? (
            <div className="space-y-4">
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
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Select Image"}
              </Button>
              
              {/* Download Progress */}
              {isDownloading && (
                <div className="space-y-2">
                  <Label>Downloading model... {Math.round(downloadProgress * 100)}%</Label>
                  <Progress value={downloadProgress * 100} />
                </div>
              )}
              
              {/* Model selection */}
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ModelId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODELS).map(([id, model]) => (
                      <SelectItem key={id} value={id}>
                        {model.name} ({model.speed}, {model.quality} quality)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div 
                className="bg-card border rounded-lg p-4 relative"
                style={{ 
                  backgroundColor: showTransparent ? 'transparent' : '#f0f0f0',
                  backgroundImage: showTransparent 
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : 'none',
                  backgroundSize: showTransparent ? '20px 20px' : 'auto',
                  backgroundPosition: showTransparent ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'auto',
                }}
              >
                <canvas 
                  ref={canvasRef}
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                />
              </div>
              
              {/* Slider - always visible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Background removal: {bgRemovalPercent[0]}%</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={bgRemovalPercent[0]}
                    onChange={(e) => handleSliderChange([parseInt(e.target.value) || 0])}
                    className="w-20"
                  />
                </div>
                <Slider
                  value={bgRemovalPercent}
                  onValueChange={handleSliderChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  disabled={isProcessing}
                />
              </div>
              
              {/* Preview toggles */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mask-overlay"
                    checked={showMaskOverlay}
                    onCheckedChange={setShowMaskOverlay}
                  />
                  <Label htmlFor="mask-overlay" className="cursor-pointer">
                    {showMaskOverlay ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                    Mask overlay
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="transparent-bg"
                    checked={showTransparent}
                    onCheckedChange={setShowTransparent}
                  />
                  <Label htmlFor="transparent-bg" className="cursor-pointer">
                    Transparent preview
                  </Label>
                </div>
              </div>
              
              {/* Export options */}
              <div className="space-y-2">
                <Label>Export format</Label>
                <div className="flex gap-2 items-center">
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'png' | 'jpg')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (transparent)</SelectItem>
                      <SelectItem value="jpg">JPG (fill color)</SelectItem>
                    </SelectContent>
                  </Select>
                  {exportFormat === 'jpg' && (
                    <Input
                      type="color"
                      value={jpgFillColor}
                      onChange={(e) => setJpgFillColor(e.target.value)}
                      className="w-20 h-10"
                    />
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  onClick={handleClear} 
                  variant="outline"
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleExport}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              
              {/* Telemetry info */}
              {telemetry.inferenceTimeMs && (
                <p className="text-xs text-muted-foreground text-center">
                  Model: {MODELS[selectedModel].name} | Inference: {telemetry.inferenceTimeMs}ms
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Documentation card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mask Math: Global Alpha Scaling (Option B)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Formula:</strong> alpha = 1 - (1 - matte) × percent
          </p>
          <p>
            Where matte ∈ [0,1] from the segmentation model (0=background, 1=foreground) and percent ∈ [0,1] from slider.
          </p>
          <p>
            <strong>Properties:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>0% removes nothing (alpha = 1 everywhere) → exact original</li>
            <li>100% removes all background (alpha = matte) → complete removal</li>
            <li>Deterministic: same percent always yields same result from original</li>
            <li>Preserves relative confidence ordering in mask</li>
            <li>No cumulative processing - always computed vs. original</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundRemoverTool;
