import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";

interface PDFEditorCanvasProps {
  width: number;
  height: number;
  onExport: (canvas: FabricCanvas) => void;
  snapToGrid?: boolean;
  zoom?: number;
}

export const PDFEditorCanvas = ({ 
  width, 
  height, 
  onExport,
  snapToGrid = false,
  zoom = 1
}: PDFEditorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    // Enable object controls
    canvas.on('object:moving', (e) => {
      if (!e.target || !snapToGrid) return;
      const gridSize = 20;
      e.target.set({
        left: Math.round((e.target.left || 0) / gridSize) * gridSize,
        top: Math.round((e.target.top || 0) / gridSize) * gridSize,
      });
    });

    // Add shadow to objects for better visibility
    canvas.on('object:added', (e) => {
      if (e.target) {
        e.target.set({
          shadow: {
            color: 'rgba(0,0,0,0.3)',
            blur: 5,
            offsetX: 2,
            offsetY: 2,
          }
        });
      }
    });

    setFabricCanvas(canvas);
    onExport(canvas);

    return () => {
      canvas.dispose();
    };
  }, [width, height]); // Removed onExport from dependencies

  // Update snap to grid behavior
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.renderAll();
  }, [snapToGrid, fabricCanvas]);

  // Handle zoom
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(zoom);
    fabricCanvas.renderAll();
  }, [zoom, fabricCanvas]);

  return (
    <div className="relative w-full h-full">
      {snapToGrid && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(128,128,128,0.1) 19px, rgba(128,128,128,0.1) 20px),
              repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(128,128,128,0.1) 19px, rgba(128,128,128,0.1) 20px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      )}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10" 
        style={{ width: '100%', height: '100%' }} 
      />
    </div>
  );
};
