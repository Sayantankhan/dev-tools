import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, IText, Image as FabricImage, FabricObject } from "fabric";
import { PDFAnnotation } from "@/types/pdf-annotations";

interface PDFEditorCanvasProps {
  width: number;
  height: number;
  annotations: PDFAnnotation[];
  onAnnotationAdd: (annotation: PDFAnnotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<PDFAnnotation>) => void;
  onAnnotationRemove: (id: string) => void;
  onObjectSelect: (obj: FabricObject | null) => void;
  snapToGrid?: boolean;
  zoom?: number;
}

export const PDFEditorCanvas = ({ 
  width, 
  height, 
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationRemove,
  onObjectSelect,
  snapToGrid = false,
  zoom = 1
}: PDFEditorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const objectMapRef = useRef<Map<string, FabricObject>>(new Map());

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    // Enable object snapping
    canvas.on('object:moving', (e) => {
      if (!e.target || !snapToGrid) return;
      const gridSize = 20;
      e.target.set({
        left: Math.round((e.target.left || 0) / gridSize) * gridSize,
        top: Math.round((e.target.top || 0) / gridSize) * gridSize,
      });
    });

    // Handle object modifications
    canvas.on('object:modified', (e) => {
      if (!e.target) return;
      const id = (e.target as any).annotationId;
      if (!id) return;

      const updates: Partial<PDFAnnotation> = {
        x: e.target.left || 0,
        y: e.target.top || 0,
        width: (e.target.width || 0) * (e.target.scaleX || 1),
        height: (e.target.height || 0) * (e.target.scaleY || 1),
        rotation: e.target.angle || 0,
      };

      // If it's text, update text content
      if (e.target instanceof IText) {
        updates.text = e.target.text;
      }

      onAnnotationUpdate(id, updates);
    });

    // Handle selection
    canvas.on('selection:created', (e) => {
      onObjectSelect(e.selected?.[0] || null);
    });
    canvas.on('selection:updated', (e) => {
      onObjectSelect(e.selected?.[0] || null);
    });
    canvas.on('selection:cleared', () => {
      onObjectSelect(null);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [width, height]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setDimensions({ width, height });
    fabricCanvas.renderAll();
  }, [width, height, fabricCanvas]);

  // Update zoom
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(zoom);
    fabricCanvas.renderAll();
  }, [zoom, fabricCanvas]);

  // Load annotations onto canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear existing objects
    fabricCanvas.clear();
    objectMapRef.current.clear();

    // Load annotations
    annotations.forEach(annotation => {
      let obj: FabricObject | null = null;

      if (annotation.type === 'text' && annotation.text) {
        obj = new IText(annotation.text, {
          left: annotation.x,
          top: annotation.y,
          fontSize: annotation.fontSize || 20,
          fill: annotation.color || '#000000',
          fontFamily: annotation.fontFamily || 'Arial',
          fontWeight: annotation.fontWeight || 'normal',
          fontStyle: annotation.fontStyle || 'normal',
        });
      } else if (annotation.imageData) {
        const imgEl = new Image();
        imgEl.onload = () => {
          const img = new FabricImage(imgEl, {
            left: annotation.x,
            top: annotation.y,
            scaleX: annotation.width / imgEl.width,
            scaleY: annotation.height / imgEl.height,
            angle: annotation.rotation || 0,
          });
          (img as any).annotationId = annotation.id;
          (img as any).checkboxState = annotation.checkboxState;
          fabricCanvas.add(img);
          objectMapRef.current.set(annotation.id, img);
          fabricCanvas.renderAll();
        };
        imgEl.src = annotation.imageData;
        return; // Skip adding to canvas here, will be added in onload
      }

      if (obj) {
        (obj as any).annotationId = annotation.id;
        fabricCanvas.add(obj);
        objectMapRef.current.set(annotation.id, obj);
      }
    });

    fabricCanvas.renderAll();
  }, [annotations, fabricCanvas]);

  // Update snap to grid
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.renderAll();
  }, [snapToGrid, fabricCanvas]);

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
      />
    </div>
  );
};
