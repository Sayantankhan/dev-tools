import { Upload, Download, RotateCcw, ChevronDown, Trash2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { pipeline, env } from "@huggingface/transformers";
import { cn } from "@/lib/utils";

// Enable browser caching for models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 1024;
const SLIDER_THROTTLE_MS = 150;

const MODELS = {
  "briaai/RMBG-1.4": { name: "BRIA RMBG-1.4", speed: "fast", quality: "high" },
  "Xenova/modnet": { name: "MODNet", speed: "very-fast", quality: "medium" },
} as const;

type ModelId = keyof typeof MODELS;
type ExportFormat = "png" | "jpg" | "webp" | "svg";

interface Telemetry {
  selectedPercent: number[];
  finalPercent?: number;
  exportFormat?: ExportFormat;
  inferenceTimeMs?: number;
  modelUsed?: ModelId;
  failureCount: number;
  timeoutCount: number;
}

/* ---------------- small primitives (scoped to this instrument panel) --------------- */

const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    {children}
  </div>
);

const Toggle = ({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
      checked ? "border-primary bg-primary" : "border-border bg-muted"
    )}
  >
    <span
      className={cn(
        "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all duration-150",
        checked ? "left-[18px] bg-primary-foreground" : "left-[3px] bg-muted-foreground"
      )}
    />
  </button>
);

const Select = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) => (
  <div className="relative">
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full appearance-none rounded-md border border-border bg-input px-3 py-2 pr-8 text-xs text-foreground shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-popover text-popover-foreground">
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
  </div>
);

const Btn = ({
  variant = "ghost",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-150",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
      "disabled:cursor-not-allowed disabled:opacity-40",
      variant === "primary" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
      variant === "ghost" &&
        "border border-border bg-secondary text-secondary-foreground hover:border-primary/50 hover:text-primary",
      variant === "danger" &&
        "border border-border bg-secondary text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive",
      className
    )}
  >
    {children}
  </button>
);

/* ------------------------------ scope graph ------------------------------ */

const ScopeGraph = ({ p, matte = 0.4 }: { p: number; matte?: number }) => {
  const W = 260;
  const H = 120;
  const pad = 14;
  const x = (t: number) => pad + t * (W - pad * 2);
  const y = (a: number) => H - pad - a * (H - pad * 2);
  const alphaAt = (t: number) => 1 - (1 - matte) * t;
  const path = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${i === 0 ? "M" : "L"}${x(t).toFixed(1)},${y(alphaAt(t)).toFixed(1)}`;
  }).join(" ");
  const a = alphaAt(p);

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Alpha response curve">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={W - pad}
            y1={y(g)}
            y2={y(g)}
            stroke="hsl(var(--border))"
            strokeWidth={g === 0 || g === 1 ? 1 : 0.5}
          />
        ))}
        <line x1={pad} x2={pad} y1={pad} y2={H - pad} stroke="hsl(var(--border))" strokeWidth={1} />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
        <line
          x1={x(p)}
          x2={x(p)}
          y1={pad}
          y2={H - pad}
          stroke="hsl(var(--primary))"
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <circle cx={x(p)} cy={y(a)} r={3.5} fill="hsl(var(--primary))" />
        <circle cx={x(p)} cy={y(a)} r={7} fill="hsl(var(--primary))" fillOpacity={0.15} />
        <text x={pad} y={H - 3} fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">p=0</text>
        <text x={W - pad - 14} y={H - 3} fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">p=1</text>
      </svg>
      <div className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
        α at matte={matte.toFixed(1)} → <span className="text-primary">{a.toFixed(3)}</span>
      </div>
    </div>
  );
};


/* -------------------------------- tool -------------------------------- */

export const BackgroundRemoverTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maskData, setMaskData] = useState<Uint8Array | Uint8ClampedArray | Float32Array | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bgRemovalPercent, setBgRemovalPercent] = useState([0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMaskOverlay, setShowMaskOverlay] = useState(false);
  const [showTransparent, setShowTransparent] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [jpgFillColor, setJpgFillColor] = useState("#ffffff");
  const [selectedModel, setSelectedModel] = useState<ModelId>("briaai/RMBG-1.4");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderTimeoutRef = useRef<NodeJS.Timeout>();
  const processingAbortRef = useRef<AbortController>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [telemetry, setTelemetry] = useState<Telemetry>({
    selectedPercent: [],
    failureCount: 0,
    timeoutCount: 0,
  });

  useEffect(() => {
    console.log("📊 Telemetry:", telemetry);
  }, [telemetry]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
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
      if (processingAbortRef.current) {
        processingAbortRef.current.abort();
      }
      processingAbortRef.current = new AbortController();

      setIsDownloading(true);
      setDownloadProgress(0);
      toast.info("Loading AI model (first time only - will be cached)...");

      const segmenter = await pipeline("image-segmentation", selectedModel, {
        device: "webgpu",
        progress_callback: (progress: any) => {
          if (progress.status === "progress" && progress.progress) {
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

      setOriginalImage(img);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

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

      if (processingAbortRef.current?.signal.aborted) {
        URL.revokeObjectURL(url);
        return;
      }

      toast.info("Processing image...");

      const result = await segmenter(canvas.toDataURL("image/png"));

      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error("Invalid segmentation result");
      }

      const mask = result[0].mask.data as Uint8Array | Uint8ClampedArray | Float32Array;
      setMaskData(mask);

      const inferenceTime = Date.now() - startTime;
      setTelemetry((prev) => ({
        ...prev,
        inferenceTimeMs: inferenceTime,
        modelUsed: selectedModel,
      }));

      toast.success("Model loaded from cache" + (inferenceTime > 5000 ? "" : " (instant)"));
      URL.revokeObjectURL(url);
      setIsProcessing(false);

      applyMask(0);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
      setTelemetry((prev) => ({ ...prev, failureCount: prev.failureCount + 1 }));
      setIsProcessing(false);
    }
  };

  const applyMask = useCallback(
    (percent: number) => {
      if (!originalCanvas || !maskData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = originalCanvas.width;
      canvas.height = originalCanvas.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(originalCanvas, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const removalPercent = percent / 100;
      const bytesPerEl = (maskData as any)?.BYTES_PER_ELEMENT ?? 4;

      for (let i = 0; i < maskData.length; i++) {
        const raw = maskData[i] as number;
        const m = bytesPerEl === 1 ? raw / 255 : raw;
        const matte = Math.min(1, Math.max(0, m));

        const alpha01 = 1 - (1 - matte) * removalPercent;

        if (showMaskOverlay) {
          const removeAmount = (1 - matte) * removalPercent;
          data[i * 4] = Math.min(255, data[i * 4] + removeAmount * 255);
        }

        data[i * 4 + 3] = Math.round(alpha01 * 255);
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob && previewUrl) {
          URL.revokeObjectURL(previewUrl);
          const newUrl = URL.createObjectURL(blob);
          setPreviewUrl(newUrl);
        }
      }, "image/png");
    },
    [originalCanvas, maskData, showMaskOverlay, previewUrl]
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setBgRemovalPercent(value);
      setTelemetry((prev) => ({
        ...prev,
        selectedPercent: [...prev.selectedPercent, value[0]],
      }));

      if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
      sliderTimeoutRef.current = setTimeout(() => applyMask(value[0]), SLIDER_THROTTLE_MS);
    },
    [applyMask]
  );

  useEffect(() => {
    if (maskData && originalCanvas) applyMask(bgRemovalPercent[0]);
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
    setTelemetry({ selectedPercent: [], failureCount: 0, timeoutCount: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerDownload = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const baseName = selectedFile?.name.replace(/\.[^.]+$/, "") || "no-background";

    if (exportFormat === "svg") {
      const dataUrl = canvas.toDataURL("image/png");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "export.svg");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setTelemetry((prev) => ({ ...prev, finalPercent: bgRemovalPercent[0], exportFormat }));
      toast.success("Exported as SVG!");
      return;
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext("2d");
    if (!finalCtx) return;

    if (exportFormat === "jpg") {
      finalCtx.fillStyle = jpgFillColor;
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }

    finalCtx.drawImage(canvas, 0, 0);

    const mime =
      exportFormat === "png" ? "image/png" : exportFormat === "webp" ? "image/webp" : "image/jpeg";

    finalCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${baseName}-no-bg.${exportFormat}`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTelemetry((prev) => ({ ...prev, finalPercent: bgRemovalPercent[0], exportFormat }));
        toast.success(`Exported as ${exportFormat.toUpperCase()}!`);
      },
      mime,
      0.95
    );
  };

  const p = bgRemovalPercent[0] / 100;
  const dims = originalCanvas ? `${originalCanvas.width}×${originalCanvas.height}` : "—";

  return (
    <div className="min-h-full bg-[#0c0f0e] text-[#dfe4e0]">
      <div
        className="min-h-full w-full px-4 py-5 md:px-6"
        style={{
          backgroundImage:
            "radial-gradient(60rem 32rem at 0% 0%, rgba(94,255,158,0.06), transparent 60%)",
        }}
      >
        {/* Title */}
        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#525b58]">
            image &amp; media / segmentation
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[#dfe4e0]">BG Remover</h1>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* LEFT */}
          <div className="flex flex-col gap-3">
            {/* Upload panel */}
            <Panel className="p-3">
              <SectionLabel>Source</SectionLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={cn(
                  "mt-2 flex w-full flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed px-3 py-5 transition-colors duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5eff9e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14181a]",
                  selectedFile
                    ? "border-[#245c3f] bg-[#245c3f]/10"
                    : "border-[#262b2d] bg-[#0c0f0e] hover:border-[#245c3f]"
                )}
              >
                <Upload className="h-4 w-4 text-[#5eff9e]" strokeWidth={1.75} />
                {selectedFile ? (
                  <>
                    <span className="max-w-full truncate font-mono text-[11px] text-[#dfe4e0]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-[#7c8783]">click to replace</span>
                  </>
                ) : (
                  <>
                    <span className="text-[12px] font-medium text-[#dfe4e0]">
                      {isProcessing ? "Processing…" : "Select image"}
                    </span>
                    <span className="font-mono text-[10px] text-[#525b58]">PNG · JPG · WEBP</span>
                  </>
                )}
              </button>

              {isDownloading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#7c8783]">
                    <span>downloading model</span>
                    <span className="text-[#5eff9e]">
                      {Math.round(Math.min(downloadProgress, 100))}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#0c0f0e]">
                    <div
                      className="h-full rounded-full bg-[#5eff9e] transition-all"
                      style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                <SectionLabel>AI model</SectionLabel>
                <Select
                  ariaLabel="AI model"
                  value={selectedModel}
                  onChange={(v) => setSelectedModel(v as ModelId)}
                  options={Object.entries(MODELS).map(([id, m]) => ({
                    value: id as ModelId,
                    label: `${m.name} · ${m.speed} · ${m.quality}`,
                  }))}
                />
              </div>
            </Panel>

            {/* Controls panel */}
            <Panel className="p-3">
              <div className="flex items-center justify-between">
                <SectionLabel>Background removal</SectionLabel>
                <span className="font-mono text-[11px] text-[#5eff9e]">
                  {bgRemovalPercent[0]}%
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={bgRemovalPercent[0]}
                disabled={isProcessing}
                onChange={(e) => handleSliderChange([parseInt(e.target.value, 10)])}
                aria-label="Background removal percentage"
                className="bgr-slider mt-3 w-full"
                style={
                  {
                    "--fill": `${bgRemovalPercent[0]}%`,
                  } as React.CSSProperties
                }
              />

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="mask-overlay" className="text-[12px] text-[#7c8783]">
                    Mask overlay
                  </label>
                  <Toggle id="mask-overlay" checked={showMaskOverlay} onChange={setShowMaskOverlay} />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="transparent-bg" className="text-[12px] text-[#7c8783]">
                    Transparent preview
                  </label>
                  <Toggle id="transparent-bg" checked={showTransparent} onChange={setShowTransparent} />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <SectionLabel>Export format</SectionLabel>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      ariaLabel="Export format"
                      value={exportFormat}
                      onChange={(v) => setExportFormat(v as ExportFormat)}
                      options={[
                        { value: "png", label: "PNG · transparent" },
                        { value: "jpg", label: "JPG · fill color" },
                        { value: "webp", label: "WEBP · transparent" },
                        { value: "svg", label: "SVG · embedded" },
                      ]}
                    />
                  </div>
                  {exportFormat === "jpg" && (
                    <input
                      aria-label="JPG fill color"
                      type="color"
                      value={jpgFillColor}
                      onChange={(e) => setJpgFillColor(e.target.value)}
                      className="h-8 w-9 cursor-pointer rounded-[8px] border border-[#262b2d] bg-[#0c0f0e] p-0.5"
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Btn variant="ghost" onClick={handleReset} disabled={!originalCanvas}>
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> Reset
                </Btn>
                <Btn variant="danger" onClick={handleClear} disabled={!selectedFile}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Clear
                </Btn>
                <Btn variant="primary" onClick={handleExport} disabled={!originalCanvas}>
                  <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> Export
                </Btn>
              </div>
            </Panel>
          </div>

          {/* RIGHT */}
          <Panel className="flex flex-col overflow-hidden bg-[#191e20]">
            {/* toolbar */}
            <div className="flex items-center justify-between border-b border-[#262b2d] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    originalCanvas ? "bg-[#5eff9e]" : "bg-[#525b58]"
                  )}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7c8783]">
                  live preview
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#525b58]">{dims}</span>
            </div>

            {/* preview */}
            <div className="flex h-[360px] items-center justify-center bg-[#0c0f0e] p-3">
              <div
                className="flex h-full w-full items-center justify-center rounded-[8px]"
                style={
                  showTransparent
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, #1b2022 25%, transparent 25%), linear-gradient(-45deg, #1b2022 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b2022 75%), linear-gradient(-45deg, transparent 75%, #1b2022 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                        backgroundColor: "#121617",
                      }
                    : { backgroundColor: "#f0f0f0" }
                }
              >
                <canvas
                  ref={canvasRef}
                  className={cn(
                    "max-h-full max-w-full object-contain",
                    !originalCanvas && "hidden"
                  )}
                />
                {!originalCanvas && (
                  <span className="font-mono text-[11px] text-[#525b58]">no signal</span>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between border-t border-[#262b2d] px-3 py-2">
              <span className="font-mono text-[10px] text-[#7c8783]">
                model: <span className="text-[#dfe4e0]">{MODELS[selectedModel].name}</span>
              </span>
              <span className="font-mono text-[10px] text-[#7c8783]">
                inference:{" "}
                <span className="text-[#5eff9e]">
                  {telemetry.inferenceTimeMs ? `${telemetry.inferenceTimeMs}ms` : "—"}
                </span>
              </span>
            </div>
          </Panel>
        </div>

        {/* Mask math */}
        <Panel className="mt-3">
          <button
            type="button"
            onClick={() => setMathOpen((o) => !o)}
            aria-expanded={mathOpen}
            className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5eff9e]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-[12px] font-medium text-[#dfe4e0]">Mask math</span>
              <span className="truncate rounded-full border border-[#245c3f] bg-[#245c3f]/20 px-2 py-0.5 font-mono text-[10px] text-[#5eff9e]">
                α = 1 − (1 − matte) × p
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-[#7c8783] transition-transform duration-150",
                mathOpen && "rotate-180"
              )}
              strokeWidth={1.75}
            />
          </button>

          {mathOpen && (
            <div className="grid grid-cols-1 gap-4 border-t border-[#262b2d] p-3 md:grid-cols-[minmax(0,1fr)_280px]">
              <ul className="space-y-2 text-[12px] text-[#7c8783]">
                {[
                  <>0% removes nothing (α = 1 everywhere) → exact original</>,
                  <>100% removes all background (α = matte) → complete removal</>,
                  <>Deterministic: same p always yields the same result from the original</>,
                  <>Preserves relative confidence ordering in the mask</>,
                  <>No cumulative processing — always computed vs. the original</>,
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[9px] h-px w-2.5 shrink-0 bg-[#245c3f]" />
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex gap-2.5">
                  <span className="mt-[9px] h-px w-2.5 shrink-0 bg-[#245c3f]" />
                  <span>
                    Where{" "}
                    <code className="rounded border border-[#245c3f] bg-[#245c3f]/20 px-1 py-0.5 font-mono text-[10px] text-[#5eff9e]">
                      matte ∈ [0,1]
                    </code>{" "}
                    (0 = background, 1 = foreground) and{" "}
                    <code className="rounded border border-[#245c3f] bg-[#245c3f]/20 px-1 py-0.5 font-mono text-[10px] text-[#5eff9e]">
                      p ∈ [0,1]
                    </code>{" "}
                    from the slider.
                  </span>
                </li>
              </ul>

              <ScopeGraph p={p} matte={0.4} />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default BackgroundRemoverTool;
