import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, IText, Path } from "fabric";
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

    const isDrawing = activeTool === "signature";
    fabricCanvas.isDrawingMode = isDrawing;
    
    if (isDrawing && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = "#000000";
      fabricCanvas.freeDrawingBrush.width = 2;
    }
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

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "transparent";
    fabricCanvas.renderAll();
    toast.success("Annotations cleared!");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-card p-3 rounded-lg border">
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
        <div className="flex gap-2 items-end bg-card p-3 rounded-lg border">
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
        <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
          Draw your signature on the PDF below. Use the Select tool to move or resize it.
        </div>
      )}

      <div className="relative">
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
      </div>
    </div>
  );
};
