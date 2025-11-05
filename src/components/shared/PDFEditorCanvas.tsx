import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, IText, Image as FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Type, PenTool, Eraser, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PDFEditorCanvasProps {
  width: number;
  height: number;
  onExport: (canvas: FabricCanvas) => void;
}

export const PDFEditorCanvas = ({ width, height, onExport }: PDFEditorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "text" | "signature">("select");
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "transparent",
    });

    // Initialize drawing brush if needed
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = "#000000";
      canvas.freeDrawingBrush.width = 2;
    }

    setFabricCanvas(canvas);
    onExport(canvas);

    return () => {
      canvas.dispose();
    };
  }, [width, height, onExport]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Disable free drawing; signature will be uploaded as an image
    fabricCanvas.isDrawingMode = false;
  }, [activeTool, fabricCanvas]);

  const handleAddText = () => {
    if (!fabricCanvas || !textInput.trim()) {
      toast.error("Please enter some text");
      return;
    }

    const text = new IText(textInput, {
      left: width / 2 - 50,
      top: height / 2,
      fontSize: 20,
      fill: "#000000",
      fontFamily: "Arial",
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    setTextInput("");
    toast.success("Text added! Drag to reposition.");
  };

  // Signature upload handlers
  const handleSignatureUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fabricCanvas || !file) return;
    const url = URL.createObjectURL(file);
    const imgEl = new Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => {
      try {
        const img = new FabricImage(imgEl, {
          left: width / 2 - (imgEl.naturalWidth * 0.5) / 2,
          top: height / 2 - (imgEl.naturalHeight * 0.5) / 2,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        toast.success("Signature image added! Drag to position.");
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    imgEl.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Failed to load image");
    };
    imgEl.src = url;
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "transparent";
    fabricCanvas.renderAll();
    toast.success("Annotations cleared!");
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2 items-center bg-card/90 backdrop-blur p-2 rounded-md border">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTool("select")}
        >
          <Eraser className="w-4 h-4 mr-2" />
          Select
        </Button>
        <Button
          variant={activeTool === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTool("text")}
        >
          <Type className="w-4 h-4 mr-2" />
          Text
        </Button>
        <Button
          variant={activeTool === "signature" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTool("signature")}
        >
          <PenTool className="w-4 h-4 mr-2" />
          Signature
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>

      {activeTool === "text" && (
        <div className="absolute top-14 left-2 z-10 flex gap-2 items-end bg-card/90 backdrop-blur p-3 rounded-md border">
          <div className="flex-1">
            <Label>Enter text</Label>
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your text..."
              onKeyDown={(e) => e.key === "Enter" && handleAddText()}
            />
          </div>
          <Button onClick={handleAddText}>Add Text</Button>
        </div>
      )}

      {activeTool === "signature" && (
        <div className="absolute top-14 left-2 z-10 bg-muted/90 backdrop-blur p-3 rounded-md text-sm text-muted-foreground">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <span>Upload your signature image (PNG/JPG), then drag to position and resize.</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleSignatureFileChange}
                className="hidden"
              />
              <Button size="sm" onClick={handleSignatureUploadClick}>Upload Signature</Button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
