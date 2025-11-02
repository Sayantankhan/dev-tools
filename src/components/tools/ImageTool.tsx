import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Download, Trash2, Image as ImageIcon, Scissors, Droplet } from "lucide-react";
import { ImageStateHandler } from "@/modules/state/ImageStateHandler";

export const ImageTool = () => {
  const {
    state,
    setters,
    helpers,
    actions
  } = ImageStateHandler();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.cropMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !state.cropMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    setters.setCropArea({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      width: Math.abs(currentX - dragStart.x),
      height: Math.abs(currentY - dragStart.y)
    });

    // Draw crop preview
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const img = new Image();
      img.src = state.preview;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Draw crop rectangle
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          state.cropArea.x,
          state.cropArea.y,
          state.cropArea.width,
          state.cropArea.height
        );
        
        // Dim outside area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, state.cropArea.y);
        ctx.fillRect(0, state.cropArea.y, state.cropArea.x, state.cropArea.height);
        ctx.fillRect(state.cropArea.x + state.cropArea.width, state.cropArea.y, canvas.width - state.cropArea.x - state.cropArea.width, state.cropArea.height);
        ctx.fillRect(0, state.cropArea.y + state.cropArea.height, canvas.width, canvas.height - state.cropArea.y - state.cropArea.height);
      };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDrop={actions.handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => state.fileInputRef.current?.click()}
      >
        <input
          ref={state.fileInputRef}
          type="file"
          accept="image/*"
          onChange={actions.handleFileSelect}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-foreground font-medium mb-2">
          Drop an image here or click to browse
        </p>
        <p className="text-sm text-muted-foreground">
          PNG, JPEG, WEBP, GIF, TIFF supported • Max 25MB
        </p>
        {state.fileName && (
          <p className="text-sm text-primary mt-2">📎 {state.fileName}</p>
        )}
      </div>

      {state.preview && (
        <>
          {/* Tools */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => setters.setCropMode(!state.cropMode)} 
              variant={state.cropMode ? "default" : "outline"}
            >
              <Scissors className="w-4 h-4 mr-2" />
              {state.cropMode ? "Cancel Crop" : "Crop Image"}
            </Button>
            
            {state.cropMode && state.cropArea.width > 0 && (
              <Button onClick={actions.handleCrop} disabled={state.processing} className="btn-gradient">
                Apply Crop
              </Button>
            )}

            <Button onClick={actions.handleRemoveWatermark} disabled={state.processing} variant="outline">
              <Droplet className="w-4 h-4 mr-2" />
              Remove Watermark
            </Button>
          </div>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Width (px)</Label>
                <Input
                  type="number"
                  value={state.width}
                  onChange={(e) => setters.setWidth(parseInt(e.target.value) || 0)}
                  className="mt-2"
                  disabled={state.cropMode}
                />
              </div>

              <div>
                <Label>Height (px) {state.keepAspectRatio && "(auto)"}</Label>
                <Input
                  type="number"
                  value={state.height}
                  onChange={(e) => setters.setHeight(parseInt(e.target.value) || 0)}
                  disabled={state.keepAspectRatio || state.cropMode}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="aspect-ratio"
                  checked={state.keepAspectRatio}
                  onCheckedChange={(checked) => setters.setKeepAspectRatio(checked as boolean)}
                  disabled={state.cropMode}
                />
                <Label htmlFor="aspect-ratio" className="cursor-pointer">
                  Keep aspect ratio
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quality: {state.quality}%</Label>
                <Slider
                  value={[state.quality]}
                  onValueChange={(values) => setters.setQuality(values[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-2"
                  disabled={state.cropMode}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="convert-jpeg"
                  checked={state.convertToJPEG}
                  onCheckedChange={(checked) => setters.setConvertToJPEG(checked as boolean)}
                  disabled={state.cropMode}
                />
                <Label htmlFor="convert-jpeg" className="cursor-pointer">
                  Convert to JPEG
                </Label>
              </div>

              {!state.cropMode && (
                <div className="pt-4">
                  <Button onClick={actions.handleConvert} disabled={state.processing} className="btn-gradient w-full">
                    {state.processing ? (
                      "Processing..."
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Convert Image
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Original ({state.originalDimensions.width}×{state.originalDimensions.height})</Label>
              <div className="bg-input rounded-lg p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                {state.cropMode ? (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[400px] cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                ) : (
                  <img src={state.preview} alt="Original" className="max-w-full max-h-[400px] object-contain" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Size: {helpers.formatFileSize(state.originalSize)}
              </p>
              {state.cropMode && (
                <p className="text-sm text-primary">
                  Drag to select crop area
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Converted</Label>
              <div className="bg-input rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {state.convertedImage ? (
                  <img src={state.convertedImage} alt="Converted" className="max-w-full max-h-[400px] object-contain" />
                ) : (
                  <p className="text-muted-foreground">Process image to see result</p>
                )}
              </div>
              {state.convertedImage && (
                <>
                  <p className="text-sm text-success">
                    Size: {helpers.formatFileSize(state.convertedSize)} 
                    {state.originalSize > state.convertedSize && 
                      ` (${((1 - state.convertedSize / state.originalSize) * 100).toFixed(1)}% smaller)`
                    }
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={actions.handleDownload} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={actions.handleClear} variant="outline">
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