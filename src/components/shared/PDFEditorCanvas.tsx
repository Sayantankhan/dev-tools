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

  console.log('PDFEditorCanvas render:', { width, height, annotationsCount: annotations.length });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('Initializing Fabric canvas with dimensions:', width, height);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    console.log('Fabric canvas created:', canvas);

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

      console.log('Object modified:', id);

      const updates: Partial<PDFAnnotation> = {
        x: e.target.left || 0,
        y: e.target.top || 0,
        width: (e.target.width || 0) * (e.target.scaleX || 1),
        height: (e.target.height || 0) * (e.target.scaleY || 1),
        rotation: e.target.angle || 0,
      };

      // If it's text, update text content and effective size from scaling
      if (e.target instanceof IText) {
        updates.text = e.target.text;
        const sx = (e.target.scaleX || 1);
        const sy = (e.target.scaleY || 1);
        const baseFont = (e.target.fontSize || 20);
        const eff = baseFont * ((sx + sy) / 2);
        (updates as any).effectiveFontSize = eff;
      }

      onAnnotationUpdate(id, updates);
    });

    // Ensure final position persists even if 'modified' doesn't fire (e.g., quick drags)
    canvas.on('mouse:up', () => {
      const target = canvas.getActiveObject?.();
      if (!target) return;
      const id = (target as any).annotationId;
      if (!id) return;

      const updates: Partial<PDFAnnotation> = {
        x: target.left || 0,
        y: target.top || 0,
        width: (target.width || 0) * (target.scaleX || 1),
        height: (target.height || 0) * (target.scaleY || 1),
        rotation: target.angle || 0,
      };

      if (target instanceof IText) {
        updates.text = target.text;
        const sx = (target.scaleX || 1);
        const sy = (target.scaleY || 1);
        const baseFont = (target.fontSize || 20);
        const eff = baseFont * ((sx + sy) / 2);
        (updates as any).effectiveFontSize = eff;
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
      console.log('Disposing Fabric canvas');
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
    if (!fabricCanvas) {
      console.log('No fabric canvas yet');
      return;
    }

    console.log('Loading annotations onto canvas:', annotations);

    // Clear existing objects that are not in current annotations
    const currentAnnotationIds = new Set(annotations.map(a => a.id));
    const objectsToRemove: FabricObject[] = [];
    
    fabricCanvas.getObjects().forEach(obj => {
      const annotationId = (obj as any).annotationId;
      if (annotationId && !currentAnnotationIds.has(annotationId)) {
        objectsToRemove.push(obj);
        objectMapRef.current.delete(annotationId);
      }
    });
    
    objectsToRemove.forEach(obj => fabricCanvas.remove(obj));

    // Add or update annotations
    annotations.forEach(annotation => {
      console.log('Processing annotation:', annotation);
      const existingObj = objectMapRef.current.get(annotation.id);
      
      if (existingObj) {
        console.log('Updating existing object:', annotation.id);
        // Update existing object
        if (annotation.type === 'text' && existingObj instanceof IText) {
          existingObj.set({
            left: annotation.x,
            top: annotation.y,
            text: annotation.text || '',
            fontSize: annotation.fontSize || 20,
            fill: annotation.color || '#000000',
            fontFamily: annotation.fontFamily || 'Arial',
            fontWeight: annotation.fontWeight || 'normal',
            fontStyle: annotation.fontStyle || 'normal',
          });
        } else if (existingObj instanceof FabricImage) {
          existingObj.set({
            left: annotation.x,
            top: annotation.y,
            angle: annotation.rotation || 0,
          });
          (existingObj as any).checkboxState = annotation.checkboxState;
          
          // Update image if imageData changed
          if (annotation.imageData && (existingObj as any).lastImageData !== annotation.imageData) {
            const imgEl = new Image();
            imgEl.onload = () => {
              existingObj.setElement(imgEl);
              existingObj.set({
                scaleX: annotation.width / imgEl.width,
                scaleY: annotation.height / imgEl.height,
              });
              (existingObj as any).lastImageData = annotation.imageData;
              fabricCanvas.renderAll();
            };
            imgEl.src = annotation.imageData;
          }
        }
        fabricCanvas.renderAll();
        return;
      }

      // Create new object
      console.log('Creating new object for annotation:', annotation.id);
      if (annotation.type === 'text' && annotation.text) {
        const textObj = new IText(annotation.text, {
          left: annotation.x,
          top: annotation.y,
          fontSize: annotation.fontSize || 20,
          fill: annotation.color || '#000000',
          fontFamily: annotation.fontFamily || 'Arial',
          fontWeight: annotation.fontWeight || 'normal',
          fontStyle: annotation.fontStyle || 'normal',
        });
        (textObj as any).annotationId = annotation.id;
        console.log('Adding text object to canvas:', textObj);
        fabricCanvas.add(textObj);
        objectMapRef.current.set(annotation.id, textObj);
        // After fabric computes layout, update measured width/height in annotation store once
        fabricCanvas.requestRenderAll();
        const measuredWidth = (textObj.width || annotation.width);
        const measuredHeight = (textObj.height || annotation.height || (annotation.fontSize || 20));
        onAnnotationUpdate(annotation.id, { width: measuredWidth, height: measuredHeight });
        fabricCanvas.renderAll();
        console.log('Canvas objects after add:', fabricCanvas.getObjects().length);
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
          (img as any).lastImageData = annotation.imageData;
          fabricCanvas.add(img);
          objectMapRef.current.set(annotation.id, img);
          fabricCanvas.renderAll();
        };
        imgEl.src = annotation.imageData;
      }
    });
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
