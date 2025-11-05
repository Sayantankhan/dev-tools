import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export const SignaturePad = ({ onSave, onCancel }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignaturePadLib | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    // Set canvas size
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = container.offsetWidth * ratio;
    canvas.height = 300 * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(255, 255, 255, 0)",
      penColor: "rgb(0, 0, 0)",
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16,
      velocityFilterWeight: 0.7,
    });

    setSignaturePad(pad);

    return () => {
      pad.off();
    };
  }, []);

  const handleClear = () => {
    signaturePad?.clear();
  };

  const handleSave = () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      return;
    }
    const dataUrl = signaturePad.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <Card className="p-4 bg-background">
      <div className="space-y-3">
        <div className="text-sm font-medium">Draw your signature</div>
        <div 
          className="border-2 border-dashed rounded-lg bg-white" 
          style={{ height: '300px' }}
        >
          <canvas 
            ref={canvasRef} 
            className="w-full h-full touch-none"
            style={{ width: '100%', height: '300px' }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex-1"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            Add Signature
          </Button>
        </div>
      </div>
    </Card>
  );
};
