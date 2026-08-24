import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  /** Drawing surface height in px */
  height?: number;
  /** Compact layout for narrow containers such as the sidebar */
  compact?: boolean;
}

export const SignaturePad = ({ onSave, onCancel, height = 300, compact = false }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignaturePadLib | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    // Set canvas size
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = container.offsetWidth * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgba(255, 255, 255, 0)",
      penColor: "rgb(0, 0, 0)",
      minWidth: 0.5,
      maxWidth: 2.5,
      throttle: 16,
      velocityFilterWeight: 0.7,
    });

    const onBegin = () => setHasStroke(true);
    pad.addEventListener("beginStroke", onBegin);

    setSignaturePad(pad);

    return () => {
      pad.removeEventListener("beginStroke", onBegin);
      pad.off();
    };
  }, [height]);

  const handleClear = () => {
    signaturePad?.clear();
    setHasStroke(false);
  };

  const handleSave = () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      return;
    }
    const dataUrl = signaturePad.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className={compact ? "rounded-xl border border-border bg-card p-3 shadow-sm" : "rounded-xl border border-border/60 bg-card p-4 shadow-sm"}>
      <div className="space-y-3">
        <div className="text-sm font-medium">Draw your signature</div>

        <div
          className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white transition-colors duration-150 focus-within:border-primary/60"
          style={{ height: `${height}px` }}
        >
          {!hasStroke && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="select-none text-sm font-medium tracking-wide text-neutral-300">
                Draw here
              </span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="relative h-full w-full touch-none"
            style={{ width: "100%", height: `${height}px` }}
          />
        </div>

        <div className={compact ? "flex flex-wrap items-center gap-2" : "flex items-center gap-2"}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-9 flex-1 rounded-lg border border-transparent text-muted-foreground transition-all duration-150 hover:border-border/70 hover:text-foreground"
          >
            <Eraser className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-9 flex-1 rounded-lg border-border/70 transition-all duration-150"
          >
            <X className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-9 flex-1 rounded-lg bg-primary text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.97]"
          >
            <Check className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Add Signature
          </Button>
        </div>
      </div>
    </div>
  );
};
