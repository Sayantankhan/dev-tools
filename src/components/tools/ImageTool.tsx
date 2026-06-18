import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload, Download, RotateCcw, Undo2, Redo2, Eye, ZoomIn, ZoomOut, Maximize2,
  FlipHorizontal, FlipVertical, RotateCw, Crop as CropIcon, Sparkles, Image as ImageIcon,
  Brush, Droplet, Sun, Circle, Pipette, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type Adjust = {
  brightness: number; contrast: number; saturation: number; sharpness: number;
  highlights: number; shadows: number; whites: number; blacks: number;
  temperature: number; tint: number; vibrance: number; clarity: number;
  dehaze: number; vignette: number; grain: number;
};
type Transform = {
  rotate: number; flipH: boolean; flipV: boolean; skewX: number; skewY: number;
  crop: { x: number; y: number; w: number; h: number } | null;
  cropRatio: string;
};
type Snapshot = { adjust: Adjust; transform: Transform; imageData?: ImageData | null };

const NEUTRAL: Adjust = {
  brightness: 0, contrast: 0, saturation: 0, sharpness: 0,
  highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, clarity: 0,
  dehaze: 0, vignette: 0, grain: 0,
};
const NEUTRAL_TRANSFORM: Transform = {
  rotate: 0, flipH: false, flipV: false, skewX: 0, skewY: 0, crop: null, cropRatio: "free",
};

// ---------- Presets ----------
const PRESETS: Record<string, Partial<Adjust>> = {
  Vivid:       { saturation: 35, contrast: 20, vibrance: 25, clarity: 10 },
  Matte:       { contrast: -25, blacks: 25, highlights: -15, saturation: -10 },
  Fade:        { contrast: -20, blacks: 30, shadows: 20, saturation: -15, temperature: 5 },
  "B&W":       { saturation: -100, contrast: 15, clarity: 10 },
  Cinematic:   { contrast: 25, shadows: 15, highlights: -20, temperature: -10, tint: 5, vignette: 30 },
  "Golden Hour": { temperature: 30, tint: -5, vibrance: 20, highlights: -10, shadows: 10 },
  "Cool Tone": { temperature: -25, tint: 5, saturation: -5, contrast: 10 },
  Moody:       { contrast: 20, shadows: -20, blacks: 15, saturation: -20, vignette: 25 },
  "Soft Glow": { brightness: 10, highlights: 15, contrast: -10, clarity: -10, vibrance: 10 },
  "Cross Process": { temperature: 15, tint: -15, contrast: 25, saturation: 20, shadows: 20 },
};

// ---------- Slider Row ----------
const SliderRow = ({
  label, value, onChange, min = -100, max = 100, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono tabular-nums">{value > 0 ? `+${value}` : value}</span>
    </div>
    <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} />
  </div>
);

// ---------- Rendering pipeline ----------
function applyAdjustments(src: ImageData, a: Adjust): ImageData {
  const d = new Uint8ClampedArray(src.data);
  const w = src.width, h = src.height;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.hypot(cx, cy);

  const bri = a.brightness * 2.55;
  const con = 1 + a.contrast / 100;
  const conOffset = 128 * (1 - con);
  const sat = 1 + a.saturation / 100;
  const vib = a.vibrance / 100;
  const tempR = a.temperature * 0.3;
  const tempB = -a.temperature * 0.3;
  const tintG = a.tint * 0.3;
  const tintRB = -a.tint * 0.15;
  const hi = a.highlights / 100;
  const sh = a.shadows / 100;
  const wt = a.whites / 100;
  const bk = a.blacks / 100;
  const clar = a.clarity / 100;
  const dehazeC = 1 + a.dehaze / 80;
  const dehazeS = 1 + a.dehaze / 100;
  const dehazeOff = 128 * (1 - dehazeC);
  const vig = a.vignette / 100;
  const grainAmt = a.grain * 0.6;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // Temperature + tint
    r += tempR + tintRB;
    b += tempB + tintRB;
    g += tintG;

    // Brightness
    r += bri; g += bri; b += bri;

    // Contrast
    r = r * con + conOffset;
    g = g * con + conOffset;
    b = b * con + conOffset;

    // Dehaze (contrast + sat combo)
    if (a.dehaze) {
      r = r * dehazeC + dehazeOff;
      g = g * dehazeC + dehazeOff;
      b = b * dehazeC + dehazeOff;
    }

    // Luma for tone-band ops
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const ln = Math.max(0, Math.min(255, lum)) / 255;

    // Highlights / Shadows / Whites / Blacks
    if (hi) { const w1 = Math.pow(ln, 2) * 120 * hi; r += w1; g += w1; b += w1; }
    if (sh) { const w1 = Math.pow(1 - ln, 2) * 120 * sh; r += w1; g += w1; b += w1; }
    if (wt) { const w1 = Math.pow(ln, 4) * 80 * wt; r += w1; g += w1; b += w1; }
    if (bk) { const w1 = Math.pow(1 - ln, 4) * 80 * bk; r += w1; g += w1; b += w1; }

    // Clarity (midtone contrast)
    if (clar) {
      const mid = 1 - Math.abs(ln - 0.5) * 2;
      const boost = (ln - 0.5) * mid * 60 * clar;
      r += boost; g += boost; b += boost;
    }

    // Saturation
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    r = grey + (r - grey) * sat;
    g = grey + (g - grey) * sat;
    b = grey + (b - grey) * sat;
    if (a.dehaze) {
      r = grey + (r - grey) * dehazeS;
      g = grey + (g - grey) * dehazeS;
      b = grey + (b - grey) * dehazeS;
    }

    // Vibrance (boost less-saturated more)
    if (vib) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const s = (mx - mn) / 255;
      const k = vib * (1 - s);
      const grey2 = 0.299 * r + 0.587 * g + 0.114 * b;
      r = grey2 + (r - grey2) * (1 + k);
      g = grey2 + (g - grey2) * (1 + k);
      b = grey2 + (b - grey2) * (1 + k);
    }

    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }

  // Vignette + Grain (second pass, position-dependent)
  if (vig || grainAmt) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (vig) {
          const dist = Math.hypot(x - cx, y - cy) / maxR;
          const factor = 1 - Math.pow(dist, 2.2) * vig;
          d[i] *= factor; d[i + 1] *= factor; d[i + 2] *= factor;
        }
        if (grainAmt) {
          const n = (Math.random() - 0.5) * grainAmt;
          d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
      }
    }
  }

  return new ImageData(d, w, h);
}

function applySharpen(src: ImageData, amount: number): ImageData {
  if (!amount) return src;
  const k = amount / 100;
  const w = src.width, h = src.height;
  const s = src.data;
  const out = new Uint8ClampedArray(s);
  const c = 1 + 4 * k;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v = s[i + ch] * c
          - s[i - 4 + ch] * k - s[i + 4 + ch] * k
          - s[i - w * 4 + ch] * k - s[i + w * 4 + ch] * k;
        out[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  return new ImageData(out, w, h);
}

// ---------- Component ----------
export const ImageTool = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImage = useRef<HTMLImageElement | null>(null);
  const baseImageData = useRef<ImageData | null>(null); // retouched base (after brushes)
  const renderTimer = useRef<number | null>(null);

  const [adjust, setAdjust] = useState<Adjust>(NEUTRAL);
  const [transform, setTransform] = useState<Transform>(NEUTRAL_TRANSFORM);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showBefore, setShowBefore] = useState(false);
  const [retouchTool, setRetouchTool] = useState<"none" | "blur" | "sharpen" | "heal" | "redeye" | "dodge" | "burn">("none");
  const [brushSize, setBrushSize] = useState(40);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [hasImage, setHasImage] = useState(false);
  const [presetThumbs, setPresetThumbs] = useState<Record<string, string>>({});

  // ---------- Load image ----------
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      originalImage.current = img;
      const c = document.createElement("canvas");
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      baseImageData.current = ctx.getImageData(0, 0, c.width, c.height);
      setHasImage(true);
      setAdjust(NEUTRAL);
      setTransform(NEUTRAL_TRANSFORM);
      setActivePreset(null);
      setHistory([{ adjust: NEUTRAL, transform: NEUTRAL_TRANSFORM, imageData: baseImageData.current }]);
      setHistoryIndex(0);
      generatePresetThumbs(baseImageData.current);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const generatePresetThumbs = (base: ImageData) => {
    const thumbs: Record<string, string> = {};
    const tw = 80, th = Math.round((base.height / base.width) * tw);
    const src = document.createElement("canvas");
    src.width = base.width; src.height = base.height;
    src.getContext("2d")!.putImageData(base, 0, 0);
    const small = document.createElement("canvas");
    small.width = tw; small.height = th;
    const sctx = small.getContext("2d")!;
    sctx.drawImage(src, 0, 0, tw, th);
    const smallData = sctx.getImageData(0, 0, tw, th);
    Object.entries(PRESETS).forEach(([name, p]) => {
      const a = { ...NEUTRAL, ...p };
      const out = applyAdjustments(smallData, a);
      const c2 = document.createElement("canvas");
      c2.width = tw; c2.height = th;
      c2.getContext("2d")!.putImageData(out, 0, 0);
      thumbs[name] = c2.toDataURL("image/jpeg", 0.7);
    });
    setPresetThumbs(thumbs);
  };

  // ---------- Render ----------
  const render = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const base = baseImageData.current;
    if (!canvas || !base) return;

    let work: ImageData;
    if (showBefore) {
      work = base;
    } else {
      work = applyAdjustments(base, adjust);
      if (adjust.sharpness) work = applySharpen(work, adjust.sharpness);
    }

    // Source canvas
    const sc = document.createElement("canvas");
    sc.width = base.width; sc.height = base.height;
    sc.getContext("2d")!.putImageData(work, 0, 0);

    // Apply transforms (rotate, flip, skew, crop)
    const { rotate, flipH, flipV, skewX, skewY, crop } = transform;
    const rad = (rotate * Math.PI) / 180;
    const sw = crop ? crop.w : base.width;
    const sh = crop ? crop.h : base.height;
    const sx = crop ? crop.x : 0;
    const sy = crop ? crop.y : 0;

    // Bounding box after rotation
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const ow = Math.round(sw * cos + sh * sin);
    const oh = Math.round(sw * sin + sh * cos);

    canvas.width = ow;
    canvas.height = oh;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, ow, oh);
    ctx.save();
    ctx.translate(ow / 2, oh / 2);
    ctx.rotate(rad);
    ctx.transform(1, skewY / 100, skewX / 100, 1, 0, 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sc, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }, [adjust, transform, showBefore]);

  // Debounced render on adjust change
  useEffect(() => {
    if (!hasImage) return;
    if (renderTimer.current) cancelAnimationFrame(renderTimer.current);
    renderTimer.current = requestAnimationFrame(() => render());
  }, [render, hasImage]);

  // ---------- History ----------
  const pushHistory = useCallback((next: Partial<Snapshot> = {}) => {
    const snap: Snapshot = {
      adjust: next.adjust ?? adjust,
      transform: next.transform ?? transform,
      imageData: next.imageData ?? baseImageData.current,
    };
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      const updated = [...trimmed, snap].slice(-20);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [adjust, transform, historyIndex]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    const snap = history[i];
    setAdjust(snap.adjust); setTransform(snap.transform);
    if (snap.imageData) baseImageData.current = snap.imageData;
    setHistoryIndex(i);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    const snap = history[i];
    setAdjust(snap.adjust); setTransform(snap.transform);
    if (snap.imageData) baseImageData.current = snap.imageData;
    setHistoryIndex(i);
  };
  const resetAll = () => {
    if (!originalImage.current) return;
    const img = originalImage.current;
    const c = document.createElement("canvas");
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    baseImageData.current = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
    setAdjust(NEUTRAL); setTransform(NEUTRAL_TRANSFORM); setActivePreset(null);
    pushHistory({ adjust: NEUTRAL, transform: NEUTRAL_TRANSFORM, imageData: baseImageData.current });
    toast.success("Reset to original");
  };

  // Setter helpers that also commit history (debounced)
  const commitTimer = useRef<number | null>(null);
  const setAdj = (patch: Partial<Adjust>) => {
    setAdjust((a) => {
      const next = { ...a, ...patch };
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => pushHistory({ adjust: next }), 400);
      return next;
    });
    setActivePreset(null);
  };
  const setTrans = (patch: Partial<Transform>) => {
    setTransform((t) => {
      const next = { ...t, ...patch };
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => pushHistory({ transform: next }), 400);
      return next;
    });
  };

  const applyPreset = (name: string) => {
    if (activePreset === name) {
      setAdjust(NEUTRAL); setActivePreset(null);
      pushHistory({ adjust: NEUTRAL });
      return;
    }
    const next = { ...NEUTRAL, ...PRESETS[name] };
    setAdjust(next); setActivePreset(name);
    pushHistory({ adjust: next });
  };

  // ---------- Export ----------
  const exportImage = () => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `edited.${exportFormat}`;
    link.href = canvas.toDataURL(`image/${exportFormat}`, exportQuality / 100);
    link.click();
    toast.success("Exported");
  };

  // ---------- Retouch brushes ----------
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (retouchTool === "none" || !baseImageData.current) return;
    const canvas = displayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    // Map click to base image coords (ignoring transform for MVP; works when transform is neutral)
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    applyBrush(x, y);
  };

  const applyBrush = (cx: number, cy: number) => {
    const src = baseImageData.current!;
    const w = src.width, h = src.height;
    const r = brushSize;
    const d = new Uint8ClampedArray(src.data);

    if (retouchTool === "blur") {
      for (let y = Math.max(1, cy - r); y < Math.min(h - 1, cy + r); y++) {
        for (let x = Math.max(1, cx - r); x < Math.min(w - 1, cx + r); x++) {
          if (Math.hypot(x - cx, y - cy) > r) continue;
          const i = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            d[i + ch] = (src.data[i + ch] + src.data[i - 4 + ch] + src.data[i + 4 + ch]
              + src.data[i - w * 4 + ch] + src.data[i + w * 4 + ch]) / 5;
          }
        }
      }
    } else if (retouchTool === "sharpen") {
      for (let y = Math.max(1, cy - r); y < Math.min(h - 1, cy + r); y++) {
        for (let x = Math.max(1, cx - r); x < Math.min(w - 1, cx + r); x++) {
          if (Math.hypot(x - cx, y - cy) > r) continue;
          const i = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const v = src.data[i + ch] * 2.4
              - src.data[i - 4 + ch] * 0.35 - src.data[i + 4 + ch] * 0.35
              - src.data[i - w * 4 + ch] * 0.35 - src.data[i + w * 4 + ch] * 0.35;
            d[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
          }
        }
      }
    } else if (retouchTool === "dodge" || retouchTool === "burn") {
      const dir = retouchTool === "dodge" ? 1 : -1;
      for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist > r) continue;
          const falloff = 1 - dist / r;
          const i = (y * w + x) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const v = d[i + ch] + dir * 40 * falloff;
            d[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
          }
        }
      }
    } else if (retouchTool === "heal") {
      // clone from offset (r*1.5 away)
      const ox = cx + Math.round(r * 1.5);
      const oy = cy;
      for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
          if (Math.hypot(x - cx, y - cy) > r) continue;
          const dx = x - cx, dy = y - cy;
          const sxp = Math.min(w - 1, Math.max(0, ox + dx));
          const syp = Math.min(h - 1, Math.max(0, oy + dy));
          const si = (syp * w + sxp) * 4;
          const di = (y * w + x) * 4;
          d[di] = src.data[si]; d[di + 1] = src.data[si + 1]; d[di + 2] = src.data[si + 2];
        }
      }
    } else if (retouchTool === "redeye") {
      for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
          if (Math.hypot(x - cx, y - cy) > r) continue;
          const i = (y * w + x) * 4;
          const rv = d[i], gv = d[i + 1], bv = d[i + 2];
          if (rv > 100 && rv > gv * 1.5 && rv > bv * 1.5) {
            const grey = (gv + bv) / 2;
            d[i] = grey; d[i + 1] = grey; d[i + 2] = grey;
          }
        }
      }
    }

    const next = new ImageData(d, w, h);
    baseImageData.current = next;
    pushHistory({ imageData: next });
    render();
  };

  // ---------- Crop ratio ----------
  const applyCropRatio = (ratio: string) => {
    if (!baseImageData.current) return;
    const { width: w, height: h } = baseImageData.current;
    let cw = w, ch = h;
    if (ratio === "1:1") { cw = ch = Math.min(w, h); }
    else if (ratio === "4:3") { if (w / h > 4 / 3) cw = (h * 4) / 3; else ch = (w * 3) / 4; }
    else if (ratio === "16:9") { if (w / h > 16 / 9) cw = (h * 16) / 9; else ch = (w * 9) / 16; }
    else if (ratio === "9:16") { if (w / h > 9 / 16) cw = (h * 9) / 16; else ch = (w * 16) / 9; }
    else if (ratio === "Original" || ratio === "free") { setTrans({ crop: null, cropRatio: ratio }); return; }
    const crop = { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: Math.round(cw), h: Math.round(ch) };
    setTrans({ crop, cropRatio: ratio });
  };

  const cursorClass = retouchTool !== "none" ? "cursor-crosshair" : "cursor-default";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background border border-border rounded-lg overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Open
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="w-px h-5 bg-border mx-1" />
          <Button size="icon" variant="ghost" onClick={undo} disabled={historyIndex <= 0} title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={resetAll} disabled={!hasImage} title="Reset">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button size="icon" variant={showBefore ? "default" : "ghost"}
            onMouseDown={() => setShowBefore(true)} onMouseUp={() => setShowBefore(false)}
            onMouseLeave={() => setShowBefore(false)} disabled={!hasImage} title="Hold to compare">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))} title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom(1)} title="Fit">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(4, z + 0.2))} title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-1 tabular-nums w-12">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={(v: "png" | "jpeg") => setExportFormat(v)}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpeg">JPG</SelectItem>
            </SelectContent>
          </Select>
          {exportFormat === "jpeg" && (
            <div className="flex items-center gap-2 w-32">
              <span className="text-xs text-muted-foreground">Q</span>
              <Slider value={[exportQuality]} onValueChange={(v) => setExportQuality(v[0])} min={10} max={100} />
              <span className="text-xs tabular-nums w-8">{exportQuality}</span>
            </div>
          )}
          <Button size="sm" onClick={exportImage} disabled={!hasImage}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <div className="flex-1 bg-[#1a1a1a] overflow-auto flex items-center justify-center p-4 relative">
          {!hasImage ? (
            <div
              className="flex flex-col items-center justify-center gap-3 text-muted-foreground border-2 border-dashed border-border rounded-lg p-12 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <ImageIcon className="w-12 h-12" />
              <p className="text-sm">Drop an image or click to upload</p>
            </div>
          ) : (
            <canvas
              ref={displayCanvasRef}
              onClick={handleCanvasClick}
              className={cn("max-w-full max-h-full shadow-2xl rounded", cursorClass)}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <Tabs defaultValue="adjust" className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid grid-cols-4 m-2">
              <TabsTrigger value="adjust" className="text-xs"><Sun className="w-3 h-3 mr-1" />Adjust</TabsTrigger>
              <TabsTrigger value="filters" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />Filters</TabsTrigger>
              <TabsTrigger value="transform" className="text-xs"><CropIcon className="w-3 h-3 mr-1" />Transform</TabsTrigger>
              <TabsTrigger value="retouch" className="text-xs"><Wand2 className="w-3 h-3 mr-1" />Retouch</TabsTrigger>
            </TabsList>

            <TabsContent value="adjust" className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 mt-0">
              <Section title="Light">
                <SliderRow label="Brightness" value={adjust.brightness} onChange={(v) => setAdj({ brightness: v })} />
                <SliderRow label="Contrast" value={adjust.contrast} onChange={(v) => setAdj({ contrast: v })} />
                <SliderRow label="Highlights" value={adjust.highlights} onChange={(v) => setAdj({ highlights: v })} />
                <SliderRow label="Shadows" value={adjust.shadows} onChange={(v) => setAdj({ shadows: v })} />
                <SliderRow label="Whites" value={adjust.whites} onChange={(v) => setAdj({ whites: v })} />
                <SliderRow label="Blacks" value={adjust.blacks} onChange={(v) => setAdj({ blacks: v })} />
              </Section>
              <Section title="Color">
                <SliderRow label="Temperature" value={adjust.temperature} onChange={(v) => setAdj({ temperature: v })} />
                <SliderRow label="Tint" value={adjust.tint} onChange={(v) => setAdj({ tint: v })} />
                <SliderRow label="Saturation" value={adjust.saturation} onChange={(v) => setAdj({ saturation: v })} />
                <SliderRow label="Vibrance" value={adjust.vibrance} onChange={(v) => setAdj({ vibrance: v })} />
              </Section>
              <Section title="Detail">
                <SliderRow label="Sharpness" value={adjust.sharpness} onChange={(v) => setAdj({ sharpness: v })} min={0} max={100} />
                <SliderRow label="Clarity" value={adjust.clarity} onChange={(v) => setAdj({ clarity: v })} />
                <SliderRow label="Dehaze" value={adjust.dehaze} onChange={(v) => setAdj({ dehaze: v })} />
              </Section>
              <Section title="Effects">
                <SliderRow label="Vignette" value={adjust.vignette} onChange={(v) => setAdj({ vignette: v })} min={0} max={100} />
                <SliderRow label="Grain" value={adjust.grain} onChange={(v) => setAdj({ grain: v })} min={0} max={100} />
              </Section>
            </TabsContent>

            <TabsContent value="filters" className="flex-1 overflow-y-auto p-3 mt-0">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => applyPreset(name)}
                    className={cn(
                      "group rounded-md overflow-hidden border-2 transition-all",
                      activePreset === name ? "border-primary" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {presetThumbs[name] ? (
                        <img src={presetThumbs[name]} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <Droplet className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="px-2 py-1 text-xs text-left bg-card">{name}</div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transform" className="flex-1 overflow-y-auto p-3 mt-0 space-y-4">
              <Section title="Crop">
                <div className="grid grid-cols-3 gap-1">
                  {["free", "1:1", "4:3", "16:9", "9:16", "Original"].map((r) => (
                    <Button key={r} size="sm" variant={transform.cropRatio === r ? "default" : "outline"}
                      onClick={() => applyCropRatio(r)} className="text-xs h-8">
                      {r}
                    </Button>
                  ))}
                </div>
              </Section>
              <Section title="Rotate">
                <SliderRow label="Angle" value={transform.rotate} onChange={(v) => setTrans({ rotate: v })} min={-45} max={45} />
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setTrans({ rotate: ((transform.rotate - 90) % 360) })}>
                    <RotateCcw className="w-4 h-4 mr-1" />90°
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setTrans({ rotate: ((transform.rotate + 90) % 360) })}>
                    <RotateCw className="w-4 h-4 mr-1" />90°
                  </Button>
                </div>
              </Section>
              <Section title="Flip">
                <div className="flex gap-1">
                  <Button size="sm" variant={transform.flipH ? "default" : "outline"} className="flex-1"
                    onClick={() => setTrans({ flipH: !transform.flipH })}>
                    <FlipHorizontal className="w-4 h-4 mr-1" />Horizontal
                  </Button>
                  <Button size="sm" variant={transform.flipV ? "default" : "outline"} className="flex-1"
                    onClick={() => setTrans({ flipV: !transform.flipV })}>
                    <FlipVertical className="w-4 h-4 mr-1" />Vertical
                  </Button>
                </div>
              </Section>
              <Section title="Perspective">
                <SliderRow label="Skew X" value={transform.skewX} onChange={(v) => setTrans({ skewX: v })} min={-50} max={50} />
                <SliderRow label="Skew Y" value={transform.skewY} onChange={(v) => setTrans({ skewY: v })} min={-50} max={50} />
              </Section>
            </TabsContent>

            <TabsContent value="retouch" className="flex-1 overflow-y-auto p-3 mt-0 space-y-3">
              <p className="text-xs text-muted-foreground">Select a tool, then click on the image to apply.</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["blur", "Blur", Droplet],
                  ["sharpen", "Sharpen", Wand2],
                  ["heal", "Heal", Pipette],
                  ["redeye", "Red Eye", Circle],
                  ["dodge", "Dodge", Sun],
                  ["burn", "Burn", Brush],
                ] as const).map(([id, label, Icon]) => (
                  <Button key={id} size="sm" variant={retouchTool === id ? "default" : "outline"}
                    onClick={() => setRetouchTool(retouchTool === id ? "none" : id)} className="justify-start text-xs">
                    <Icon className="w-3 h-3 mr-1" />{label}
                  </Button>
                ))}
              </div>
              <div className="pt-2">
                <SliderRow label="Brush Size" value={brushSize} onChange={setBrushSize} min={5} max={150} />
              </div>
              {retouchTool !== "none" && (
                <div className="text-xs text-primary bg-primary/10 rounded p-2">
                  Active: {retouchTool}. Click on the image.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
    <div className="space-y-3">{children}</div>
  </div>
);
