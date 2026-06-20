import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer, LineLayer, PolygonLayer } from "@deck.gl/layers";
import {
  latLngToCell,
  cellToBoundary,
  cellToLatLng,
  cellToParent,
  cellToChildren,
  gridDisk,
  gridRingUnsafe,
  getHexagonAreaAvg,
  getHexagonEdgeLengthAvg,
  isValidCell,
} from "h3-js";
import {
  Upload, Sliders, Crosshair, Layers, X, Download, HelpCircle,
  Hexagon, MousePointer2, ZoomIn, ZoomOut, Maximize2, Compass,
  Box, Type, ChevronDown, ChevronRight, Copy, Check, Search,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------- Theme ------------------------------- */
const C = {
  bg: "#0f1117",
  panel: "#161b27",
  border: "#1e2d45",
  map: "#0a0e1a",
  cyan: "#00d4ff",
  purple: "#7c3aed",
  text: "#e2e8f0",
  textDim: "#64748b",
  input: "#1e2535",
  hover: "#1e2d45",
  ok: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
};

/* --------------------------- Color ramps --------------------------- */
type Ramp = { name: string; stops: [number, number, number][] };
const RAMPS: Record<string, Ramp> = {
  plasma: { name: "Plasma", stops: [[13,8,135],[126,3,168],[204,71,120],[248,149,64],[240,249,33]] },
  cyanfire: { name: "Cyan Fire", stops: [[5,10,40],[0,80,160],[0,212,255],[180,240,255],[255,255,255]] },
  viridis: { name: "Viridis", stops: [[68,1,84],[59,82,139],[33,144,141],[94,201,98],[253,231,37]] },
  heat: { name: "Heat", stops: [[0,0,0],[120,20,0],[230,80,0],[255,180,30],[255,255,200]] },
  ocean: { name: "Ocean", stops: [[5,15,50],[10,60,110],[20,140,160],[120,220,230],[220,250,255]] },
};
function rampColor(ramp: Ramp, t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  const n = ramp.stops.length - 1;
  const idx = x * n;
  const i = Math.floor(idx);
  const f = idx - i;
  const a = ramp.stops[i];
  const b = ramp.stops[Math.min(n, i + 1)];
  return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f];
}
function rampCss(ramp: Ramp) {
  return `linear-gradient(90deg, ${ramp.stops.map((c,i)=>`rgb(${c.join(",")}) ${i/(ramp.stops.length-1)*100}%`).join(", ")})`;
}

/* --------------------------- Types --------------------------- */
type Point = { lat: number; lng: number; value?: number; [k: string]: any };
type Agg = "count" | "sum" | "avg" | "max" | "min";

interface HexBin {
  hex: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  points: Point[];
}

/* --------------------------- Helpers --------------------------- */
function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]);
  const dLng = toR(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function parseCSV(text: string): { rows: Record<string, string>[]; cols: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { rows: [], cols: [] };
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { q = !q; continue; }
      if (c === "," && !q) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  };
  const cols = split(lines[0]).map((c) => c.trim());
  const rows = lines.slice(1).map((l) => {
    const v = split(l);
    const o: Record<string, string> = {};
    cols.forEach((c, i) => (o[c] = (v[i] ?? "").trim()));
    return o;
  });
  return { rows, cols };
}

function detectCols(cols: string[]) {
  const lc = cols.map((c) => c.toLowerCase());
  const find = (cands: string[]) => {
    for (const c of cands) {
      const i = lc.findIndex((x) => x === c);
      if (i >= 0) return cols[i];
    }
    for (const c of cands) {
      const i = lc.findIndex((x) => x.includes(c));
      if (i >= 0) return cols[i];
    }
    return cols[0];
  };
  return {
    lat: find(["latitude", "lat", "y"]),
    lng: find(["longitude", "lng", "lon", "long", "x"]),
    value: cols.find((c) => /value|count|weight|amount|score/i.test(c)) || "",
  };
}

function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) return pts;
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (O: any, A: any, B: any) => (A[0]-O[0])*(B[1]-O[1])-(A[1]-O[1])*(B[0]-O[0]);
  const lower: [number, number][] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });

/* ============================ Component ============================ */
export function HexScopeTool() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const deckRef = useRef<MapboxOverlay | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [csvCols, setCsvCols] = useState<string[]>([]);
  const [latCol, setLatCol] = useState<string>("");
  const [lngCol, setLngCol] = useState<string>("");
  const [valCol, setValCol] = useState<string>("");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  const [resolution, setResolution] = useState(7);
  const [rampKey, setRampKey] = useState<keyof typeof RAMPS>("plasma");
  const [opacity, setOpacity] = useState(80);
  const [extrude, setExtrude] = useState(true);
  const [extMult, setExtMult] = useState(3);
  const [agg, setAgg] = useState<Agg>("count");
  const [minCount, setMinCount] = useState(1);

  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; bin: HexBin } | null>(null);

  const [is3D, setIs3D] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // K-Ring
  const [searchTab, setSearchTab] = useState<"kring" | "knn">("kring");
  const [centerHex, setCenterHex] = useState<string>("");
  const [kRing, setKRing] = useState(2);
  const [ringCells, setRingCells] = useState<{ hex: string; ring: number }[]>([]);

  // K-NN
  const [originLat, setOriginLat] = useState<string>("");
  const [originLng, setOriginLng] = useState<string>("");
  const [pickMode, setPickMode] = useState(false);
  const [kNN, setKNN] = useState(10);
  const [radiusOn, setRadiusOn] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [nnResults, setNnResults] = useState<{ pt: Point; dist: number; rank: number }[]>([]);

  const [searchQ, setSearchQ] = useState("");
  const [csvHelpOpen, setCsvHelpOpen] = useState(false);
  const [resTableOpen, setResTableOpen] = useState(false);
  const [copied, setCopied] = useState("");

  /* ---------- compute bins ---------- */
  const bins = useMemo(() => {
    if (!points.length) return new Map<string, HexBin>();
    const m = new Map<string, HexBin>();
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const h = latLngToCell(p.lat, p.lng, resolution);
      let b = m.get(h);
      if (!b) {
        b = { hex: h, count: 0, sum: 0, min: Infinity, max: -Infinity, avg: 0, points: [] };
        m.set(h, b);
      }
      b.count++;
      const v = typeof p.value === "number" ? p.value : 1;
      b.sum += v;
      if (v < b.min) b.min = v;
      if (v > b.max) b.max = v;
      if (b.points.length < 50) b.points.push(p);
    }
    for (const b of m.values()) {
      b.avg = b.sum / b.count;
      if (!isFinite(b.min)) b.min = 0;
      if (!isFinite(b.max)) b.max = 0;
    }
    return m;
  }, [points, resolution]);

  const aggVal = useCallback(
    (b: HexBin) => (agg === "count" ? b.count : agg === "sum" ? b.sum : agg === "avg" ? b.avg : agg === "max" ? b.max : b.min),
    [agg]
  );

  const stats = useMemo(() => {
    const arr = Array.from(bins.values()).filter((b) => b.count >= minCount);
    let mn = Infinity, mx = -Infinity;
    for (const b of arr) { const v = aggVal(b); if (v < mn) mn = v; if (v > mx) mx = v; }
    if (!isFinite(mn)) { mn = 0; mx = 1; }
    if (mn === mx) mx = mn + 1;
    return { arr, min: mn, max: mx };
  }, [bins, minCount, aggVal]);

  const hexArea = useMemo(() => getHexagonAreaAvg(resolution, "km2"), [resolution]);
  const hexEdge = useMemo(() => getHexagonEdgeLengthAvg(resolution, "km"), [resolution]);

  /* ---------- init map ---------- */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [77.59, 12.97],
      zoom: 10,
      pitch: 40,
      bearing: 0,
      attributionControl: false,
    });
    mapRef.current = map;

    const deck = new Deck({
      canvas: "hex-deck-canvas",
      width: "100%",
      height: "100%",
      initialViewState: {
        longitude: 77.59, latitude: 12.97, zoom: 10, pitch: 40, bearing: 0,
      },
      controller: true,
      onViewStateChange: ({ viewState }) => {
        const vs = viewState as any;
        map.jumpTo({ center: [vs.longitude, vs.latitude], zoom: vs.zoom, bearing: vs.bearing, pitch: vs.pitch });
      },
      onClick: (info) => {
        if (pickModeRef.current && info.coordinate) {
          setOriginLat(info.coordinate[1].toFixed(6));
          setOriginLng(info.coordinate[0].toFixed(6));
          setPickMode(false);
          return;
        }
        if (info.object && (info.object as any).hex) {
          const h = (info.object as any).hex as string;
          setSelectedHex(h);
          setCenterHex(h);
        } else {
          setSelectedHex(null);
        }
      },
      onHover: (info) => {
        if (info.object && (info.object as any).hex) {
          setHoverInfo({ x: info.x, y: info.y, bin: info.object as HexBin });
        } else setHoverInfo(null);
      },
    });
    deckRef.current = deck;

    return () => {
      deck.finalize();
      map.remove();
      mapRef.current = null;
      deckRef.current = null;
    };
  }, []);

  const pickModeRef = useRef(pickMode);
  useEffect(() => { pickModeRef.current = pickMode; }, [pickMode]);

  /* ---------- update layers ---------- */
  useEffect(() => {
    if (!deckRef.current) return;
    const ramp = RAMPS[rampKey];
    const range = stats.max - stats.min || 1;

    const hexLayer = new H3HexagonLayer<HexBin>({
      id: "hexes",
      data: stats.arr,
      pickable: true,
      extruded: extrude && is3D,
      getHexagon: (d) => d.hex,
      getFillColor: (d) => {
        const t = (aggVal(d) - stats.min) / range;
        const c = rampColor(ramp, t);
        return [c[0], c[1], c[2], Math.round(opacity * 2.55)];
      },
      getElevation: (d) => {
        const t = (aggVal(d) - stats.min) / range;
        return t * 1000 * extMult;
      },
      getLineColor: [10, 14, 26, 200],
      lineWidthMinPixels: 1,
      stroked: true,
      updateTriggers: {
        getFillColor: [rampKey, agg, stats.min, stats.max, opacity],
        getElevation: [agg, stats.min, stats.max, extMult, extrude, is3D],
      },
      transitions: { getElevation: 300, getFillColor: 200 },
    });

    const selLayer = selectedHex
      ? new H3HexagonLayer({
          id: "sel",
          data: [{ hex: selectedHex }],
          getHexagon: (d: any) => d.hex,
          getFillColor: [255, 255, 255, 30],
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 3,
          stroked: true,
          filled: true,
          extruded: false,
        })
      : null;

    const ringLayer = ringCells.length
      ? new H3HexagonLayer({
          id: "rings",
          data: ringCells,
          getHexagon: (d: any) => d.hex,
          getFillColor: (d: any) => {
            if (d.ring === 0) return [255, 255, 255, 200];
            if (d.ring === 1) return [0, 212, 255, 180];
            if (d.ring === 2) return [59, 130, 246, 160];
            return [40 + 20 * d.ring, 80, 180 - 10 * d.ring, 140];
          },
          getLineColor: [0, 212, 255, 220],
          lineWidthMinPixels: 1,
          extruded: false,
        })
      : null;

    const nnPts = nnResults.length
      ? new ScatterplotLayer({
          id: "nn-points",
          data: nnResults,
          getPosition: (d: any) => [d.pt.lng, d.pt.lat],
          getFillColor: (d: any) => {
            const t = 1 - d.rank / Math.max(1, nnResults.length);
            return [Math.round(60 + 195 * t), Math.round(180 + 60 * t), 255, 230];
          },
          getRadius: 80,
          radiusMinPixels: 5,
          radiusMaxPixels: 12,
          stroked: true,
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 1,
        })
      : null;

    const nnLines = nnResults.length && originLat && originLng
      ? new LineLayer({
          id: "nn-lines",
          data: nnResults,
          getSourcePosition: () => [parseFloat(originLng), parseFloat(originLat)],
          getTargetPosition: (d: any) => [d.pt.lng, d.pt.lat],
          getColor: [0, 212, 255, 100],
          getWidth: 1.5,
        })
      : null;

    let hullLayer: any = null;
    if (nnResults.length >= 3) {
      const hull = convexHull(nnResults.map((r) => [r.pt.lng, r.pt.lat] as [number, number]));
      hullLayer = new PolygonLayer({
        id: "nn-hull",
        data: [{ polygon: hull }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: [0, 212, 255, 20],
        getLineColor: [0, 212, 255, 180],
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
      });
    }

    const originLayer = originLat && originLng
      ? new ScatterplotLayer({
          id: "origin",
          data: [{ p: [parseFloat(originLng), parseFloat(originLat)] }],
          getPosition: (d: any) => d.p,
          getFillColor: [0, 212, 255, 230],
          getRadius: 150,
          radiusMinPixels: 8,
          radiusMaxPixels: 16,
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          lineWidthMinPixels: 2,
        })
      : null;

    deckRef.current.setProps({
      layers: [hexLayer, ringLayer, hullLayer, nnLines, nnPts, originLayer, selLayer].filter(Boolean) as any,
    });
  }, [stats, rampKey, opacity, extrude, extMult, is3D, agg, selectedHex, ringCells, nnResults, originLat, originLng]);

  /* ---------- toggle labels ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const style = map.getStyle();
      style.layers?.forEach((l: any) => {
        if (l.type === "symbol") {
          map.setLayoutProperty(l.id, "visibility", showLabels ? "visible" : "none");
        }
      });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [showLabels]);

  /* ---------- file upload ---------- */
  const onFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || "");
      try {
        let rows: Record<string, string>[] = [];
        let cols: string[] = [];
        if (file.name.toLowerCase().endsWith(".json")) {
          const j = JSON.parse(txt);
          const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : [];
          if (!arr.length) throw new Error("Empty JSON");
          cols = Object.keys(arr[0]);
          rows = arr.map((o: any) => {
            const r: Record<string, string> = {};
            cols.forEach((c) => (r[c] = String(o[c] ?? "")));
            return r;
          });
        } else {
          const r = parseCSV(txt);
          rows = r.rows; cols = r.cols;
        }
        if (!rows.length) throw new Error("No rows");
        const det = detectCols(cols);
        setRawRows(rows);
        setCsvCols(cols);
        setLatCol(det.lat);
        setLngCol(det.lng);
        setValCol(det.value);
        setFileName(file.name);
        toast.success(`${rows.length.toLocaleString()} rows loaded`);
      } catch (e: any) {
        toast.error("Parse failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }, []);

  /* ---------- re-map rows to points when columns change ---------- */
  useEffect(() => {
    if (!rawRows.length || !latCol || !lngCol) { return; }
    const pts: Point[] = [];
    for (const r of rawRows) {
      const la = parseFloat(r[latCol]); const ln = parseFloat(r[lngCol]);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) continue;
      const p: Point = { lat: la, lng: ln, ...r };
      if (valCol && r[valCol] !== "") {
        const v = parseFloat(r[valCol]);
        if (Number.isFinite(v)) p.value = v;
      }
      pts.push(p);
    }
    setPoints(pts);
  }, [rawRows, latCol, lngCol, valCol]);

  /* ---------- fly to data extent ---------- */
  const flyToData = useCallback(() => {
    if (!points.length || !deckRef.current) return;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng; if (p.lng > maxLng) maxLng = p.lng;
    }
    const cLat = (minLat + maxLat) / 2; const cLng = (minLng + maxLng) / 2;
    const span = Math.max(maxLat - minLat, maxLng - minLng) || 0.1;
    const zoom = Math.max(3, Math.min(14, 9 - Math.log2(span * 10)));
    const vs = { longitude: cLng, latitude: cLat, zoom, pitch: is3D ? 40 : 0, bearing: 0, transitionDuration: 800 };
    deckRef.current.setProps({ initialViewState: vs as any });
    mapRef.current?.flyTo({ center: [cLng, cLat], zoom });
  }, [points, is3D]);

  useEffect(() => { if (points.length) flyToData(); /* eslint-disable-next-line */ }, [points.length > 0]);

  /* ---------- sample data ---------- */
  const loadSample = useCallback(() => {
    const arr: Record<string, string>[] = [];
    for (let i = 0; i < 500; i++) {
      const lat = 12.85 + Math.random() * 0.2;
      const lng = 77.50 + Math.random() * 0.2;
      const value = Math.round(1 + Math.random() * 99);
      arr.push({ latitude: String(lat), longitude: String(lng), value: String(value) });
    }
    setRawRows(arr);
    setCsvCols(["latitude", "longitude", "value"]);
    setLatCol("latitude"); setLngCol("longitude"); setValCol("value");
    setFileName("sample_bangalore.csv");
    toast.success("Sample dataset loaded");
  }, []);

  const clearData = () => {
    setRawRows([]); setPoints([]); setFileName(""); setCsvCols([]);
    setSelectedHex(null); setRingCells([]); setNnResults([]);
  };

  /* ---------- K-Ring ---------- */
  const runKRing = () => {
    if (!centerHex || !isValidCell(centerHex)) { toast.error("Pick a valid center hex"); return; }
    const cells: { hex: string; ring: number }[] = [{ hex: centerHex, ring: 0 }];
    for (let r = 1; r <= kRing; r++) {
      try {
        const ring = gridRingUnsafe(centerHex, r);
        ring.forEach((h) => cells.push({ hex: h, ring: r }));
      } catch {
        const disk = gridDisk(centerHex, r);
        disk.forEach((h) => { if (!cells.find((c) => c.hex === h)) cells.push({ hex: h, ring: r }); });
      }
    }
    setRingCells(cells);
  };
  const clearRings = () => setRingCells([]);

  const ringStats = useMemo(() => {
    const byR = new Map<number, number>();
    ringCells.forEach((c) => byR.set(c.ring, (byR.get(c.ring) || 0) + 1));
    return Array.from(byR.entries()).sort((a, b) => a[0] - b[0]);
  }, [ringCells]);

  /* ---------- K-NN ---------- */
  const runKNN = () => {
    const la = parseFloat(originLat); const ln = parseFloat(originLng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) { toast.error("Set origin lat/lng"); return; }
    if (!points.length) { toast.error("Load data first"); return; }
    const computed = points.map((p) => ({ pt: p, dist: haversine([la, ln], [p.lat, p.lng]) }));
    computed.sort((a, b) => a.dist - b.dist);
    let filtered = computed;
    if (radiusOn) filtered = computed.filter((c) => c.dist <= radiusKm);
    const taken = filtered.slice(0, kNN).map((c, i) => ({ ...c, rank: i + 1 }));
    if (!taken.length) { toast.warning("No points found within radius"); return; }
    if (radiusOn && taken.length < kNN) toast.warning(`Only ${taken.length} points within ${radiusKm}km`);
    setNnResults(taken);
  };
  const clearNN = () => { setNnResults([]); };

  /* ---------- export ---------- */
  const exportGeojson = () => {
    const features = stats.arr.map((b) => {
      const boundary = cellToBoundary(b.hex, true);
      return {
        type: "Feature",
        properties: { hex: b.hex, count: b.count, sum: b.sum, avg: b.avg, min: b.min, max: b.max },
        geometry: { type: "Polygon", coordinates: [boundary] },
      };
    });
    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/json" });
    download(blob, "hexscope.geojson");
  };
  const exportStats = () => {
    const head = "hex,count,sum,avg,min,max,lat,lng\n";
    const rows = stats.arr.map((b) => {
      const [la, ln] = cellToLatLng(b.hex);
      return `${b.hex},${b.count},${b.sum},${b.avg},${b.min},${b.max},${la},${ln}`;
    });
    download(new Blob([head + rows.join("\n")], { type: "text/csv" }), "hexscope_stats.csv");
  };
  const exportNN = () => {
    if (!nnResults.length) return;
    const cols = ["rank", "distance_km", "lat", "lng", "value"];
    const head = cols.join(",") + "\n";
    const rows = nnResults.map((r) => `${r.rank},${r.dist.toFixed(4)},${r.pt.lat},${r.pt.lng},${r.pt.value ?? ""}`);
    download(new Blob([head + rows.join("\n")], { type: "text/csv" }), "hexscope_knn.csv");
  };
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- search ---------- */
  const runSearch = () => {
    const q = searchQ.trim();
    if (!q) return;
    if (isValidCell(q)) {
      const [la, ln] = cellToLatLng(q);
      mapRef.current?.flyTo({ center: [ln, la], zoom: Math.max(10, resolution + 4) });
      setSelectedHex(q); setCenterHex(q);
      return;
    }
    const m = q.split(/[,\s]+/).map(Number);
    if (m.length >= 2 && m.every((n) => Number.isFinite(n))) {
      const [la, ln] = m;
      const h = latLngToCell(la, ln, resolution);
      mapRef.current?.flyTo({ center: [ln, la], zoom: Math.max(11, resolution + 4) });
      setSelectedHex(h); setCenterHex(h);
      return;
    }
    toast.error("Enter lat,lng or H3 hex ID");
  };

  /* ---------- 3D toggle ---------- */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({ pitch: is3D ? 40 : 0, duration: 500 });
  }, [is3D]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "+" || e.key === "=") setResolution((r) => Math.min(12, r + 1));
      else if (e.key === "-") setResolution((r) => Math.max(1, r - 1));
      else if (e.key.toLowerCase() === "r") flyToData();
      else if (e.key.toLowerCase() === "t") setIs3D((v) => !v);
      else if (e.key === "Escape") { setSelectedHex(null); setRingCells([]); setNnResults([]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [flyToData]);

  const selectedBin = selectedHex ? bins.get(selectedHex) : null;
  const totalHexes = stats.arr.length;
  const densest = stats.arr.reduce((m, b) => (b.count > m ? b.count : m), 0);
  const coverage = totalHexes * hexArea;

  const top5 = useMemo(
    () => [...stats.arr].sort((a, b) => b.count - a.count).slice(0, 5),
    [stats.arr]
  );

  const distribution = useMemo(() => {
    if (!stats.arr.length) return [];
    const counts = stats.arr.map((b) => b.count);
    const max = Math.max(...counts);
    const bucketsN = 10;
    const bs = new Array(bucketsN).fill(0);
    counts.forEach((c) => { const idx = Math.min(bucketsN - 1, Math.floor((c / max) * bucketsN)); bs[idx]++; });
    return bs;
  }, [stats.arr]);

  const copy = (s: string, key: string) => {
    navigator.clipboard.writeText(s);
    setCopied(key); setTimeout(() => setCopied(""), 1200);
  };

  /* =============================== UI =============================== */
  return (
    <div
      className="flex flex-col"
      style={{ background: C.bg, color: C.text, height: "calc(100vh - 56px)", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}
    >
      <style>{`
        .hxs-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .hxs-slider { -webkit-appearance: none; appearance: none; height: 3px; background: ${C.border}; border-radius: 3px; outline: none; }
        .hxs-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${C.cyan}; cursor: pointer; border: 2px solid ${C.bg}; }
        .hxs-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${C.cyan}; cursor: pointer; border: 2px solid ${C.bg}; }
        .hxs-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .hxs-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        .hxs-input { background: ${C.input}; border: 1px solid ${C.border}; color: ${C.text}; border-radius: 4px; padding: 6px 8px; font-size: 13px; outline: none; width: 100%; }
        .hxs-input:focus { border-color: ${C.cyan}; }
        .hxs-btn { background: ${C.cyan}; color: ${C.bg}; font-weight: 600; border-radius: 4px; padding: 8px 12px; font-size: 13px; transition: opacity .15s; }
        .hxs-btn:hover { opacity: .85; }
        .hxs-btn-ghost { background: ${C.input}; color: ${C.text}; border: 1px solid ${C.border}; border-radius: 4px; padding: 6px 10px; font-size: 12px; }
        .hxs-btn-ghost:hover { background: ${C.hover}; }
        .hxs-label { font-size: 11px; color: ${C.textDim}; text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>

      {/* Top nav */}
      <div className="flex items-center justify-between px-4" style={{ height: 52, background: "#0d1117", borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <Hexagon className="w-5 h-5" style={{ color: C.cyan }} />
          <div className="text-[16px] font-bold tracking-tight" style={{ letterSpacing: "-0.01em" }}>HexScope</div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: C.purple + "33", color: C.purple }}>beta</span>
          {fileName && (
            <>
              <span className="hxs-mono text-[12px] px-2 py-1 rounded flex items-center gap-1.5" style={{ background: C.input, color: C.text }}>
                {fileName}
                <button onClick={clearData}><X className="w-3 h-3" style={{ color: C.textDim }} /></button>
              </span>
              <span className="hxs-mono text-[12px] px-2 py-1 rounded" style={{ background: C.cyan + "22", color: C.cyan }}>
                {fmt(totalHexes, 0)} hexagons
              </span>
              <span className="hxs-mono text-[12px] px-2 py-1 rounded" style={{ background: C.input, color: C.text }}>
                Res {resolution}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="hxs-btn-ghost flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export <ChevronDown className="w-3 h-3" /></button>
            <div className="absolute right-0 mt-1 hidden group-hover:block rounded border z-50 min-w-[220px]" style={{ background: C.panel, borderColor: C.border }}>
              <button onClick={exportGeojson} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#1e2d45]">Export hexagons (GeoJSON)</button>
              <button onClick={exportStats} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#1e2d45]">Export stats (CSV)</button>
              <button onClick={exportNN} disabled={!nnResults.length} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#1e2d45] disabled:opacity-40">Export K-nearest (CSV)</button>
            </div>
          </div>
          <button onClick={() => setShowHelp(true)} className="hxs-btn-ghost"><HelpCircle className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDEBAR */}
        <div className="hxs-scroll overflow-y-auto" style={{ width: 280, background: C.panel, borderRight: `1px solid ${C.border}` }}>
          <div className="p-3 border-b" style={{ borderColor: C.border }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.textDim }} />
              <input
                className="hxs-input hxs-mono"
                style={{ paddingLeft: 28, fontSize: 12 }}
                placeholder="Search lat, lng or hex ID..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
          </div>

          <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
            <Sliders className="w-4 h-4" style={{ color: C.cyan }} />
            <div className="font-semibold text-[14px]">Settings</div>
          </div>

          {/* Upload */}
          <Section title="1. Data">
            <label
              className="block w-full rounded cursor-pointer text-center transition"
              style={{ border: `1px dashed ${C.border}`, padding: 16, height: 120 }}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.cyan; }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
              onDrop={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = C.border; if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
            >
              <input type="file" accept=".csv,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <Upload className="w-6 h-6 mx-auto mb-1" style={{ color: C.textDim }} />
              <div className="text-[13px] font-semibold">Drop CSV file here</div>
              <div className="text-[11px]" style={{ color: C.textDim }}>or click to browse</div>
            </label>

            <button onClick={() => setCsvHelpOpen((v) => !v)} className="mt-2 text-[11px] flex items-center gap-1" style={{ color: C.textDim }}>
              {csvHelpOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} CSV format
            </button>
            {csvHelpOpen && (
              <pre className="hxs-mono text-[10px] mt-1 p-2 rounded" style={{ background: C.input, color: C.textDim }}>
{`latitude,longitude,value
12.97,77.59,42
12.98,77.60,18
12.96,77.58,73`}
                <div className="mt-1">value is optional</div>
              </pre>
            )}

            {fileName && (
              <div className="mt-3 space-y-2">
                <div className="text-[12px] flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: C.ok }} />{fileName}</div>
                <div className="text-[12px] hxs-mono" style={{ color: C.cyan }}>{fmt(points.length, 0)} points loaded</div>
                <div className="grid grid-cols-3 gap-1">
                  <ColPick label="Lat" cols={csvCols} value={latCol} onChange={setLatCol} />
                  <ColPick label="Lng" cols={csvCols} value={lngCol} onChange={setLngCol} />
                  <ColPick label="Value" cols={["", ...csvCols]} value={valCol} onChange={setValCol} />
                </div>
              </div>
            )}

            <button onClick={loadSample} className="mt-2 text-[12px]" style={{ color: C.cyan }}>Load sample dataset →</button>
          </Section>

          {/* Resolution */}
          <Section title="2. H3 Resolution">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[12px]" style={{ color: C.textDim }}>Resolution</div>
              <div className="hxs-mono text-[24px] font-bold" style={{ color: C.cyan }}>{resolution}</div>
            </div>
            <input type="range" min={1} max={12} value={resolution} onChange={(e) => setResolution(parseInt(e.target.value))} className="hxs-slider w-full" />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: C.textDim }}>
              <span>Coarse (continents)</span><span>Fine (buildings)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
              <Stat label="Hex area" value={`~${fmt(hexArea, hexArea < 1 ? 3 : 1)} km²`} />
              <Stat label="Hexes" value={fmt(totalHexes, 0)} />
              <Stat label="Edge" value={`~${fmt(hexEdge, 2)} km`} />
            </div>
            <button onClick={() => setResTableOpen((v) => !v)} className="mt-2 text-[11px] flex items-center gap-1" style={{ color: C.textDim }}>
              {resTableOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Reference table
            </button>
            {resTableOpen && (
              <div className="mt-1 hxs-mono text-[10px] grid grid-cols-2 gap-x-2" style={{ color: C.textDim }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
                  <div key={r} className="flex justify-between">
                    <span>Res {r}</span><span>{fmt(getHexagonAreaAvg(r, "km2"), 2)} km²</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Spatial */}
          <Section title="3. Spatial Search">
            <div className="flex gap-1 mb-2">
              {(["kring", "knn"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSearchTab(t)}
                  className="flex-1 text-[12px] py-1.5 rounded transition"
                  style={{ background: searchTab === t ? C.cyan : C.input, color: searchTab === t ? C.bg : C.text, fontWeight: searchTab === t ? 600 : 400 }}
                >
                  {t === "kring" ? "K-Ring" : "K-Nearest"}
                </button>
              ))}
            </div>

            {searchTab === "kring" ? (
              <div className="space-y-2">
                <div>
                  <div className="hxs-label mb-1">Center hex</div>
                  <input className="hxs-input hxs-mono" style={{ fontSize: 11 }} value={centerHex} onChange={(e) => setCenterHex(e.target.value)} placeholder="Click map or paste hex" />
                </div>
                <div>
                  <div className="hxs-label mb-1">K = {kRing}</div>
                  <div className="flex items-center gap-1">
                    <button className="hxs-btn-ghost" onClick={() => setKRing(Math.max(1, kRing - 1))}>−</button>
                    <input type="number" className="hxs-input hxs-mono text-center" value={kRing} min={1} max={10} onChange={(e) => setKRing(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                    <button className="hxs-btn-ghost" onClick={() => setKRing(Math.min(10, kRing + 1))}>+</button>
                  </div>
                </div>
                <button onClick={runKRing} className="hxs-btn w-full">Find Neighbors</button>
                {ringCells.length > 0 && (
                  <div className="text-[12px] space-y-0.5 hxs-mono p-2 rounded" style={{ background: C.input }}>
                    {ringStats.map(([r, n]) => <div key={r}>Ring {r}: {n} hexagons</div>)}
                    <div className="pt-1 mt-1" style={{ borderTop: `1px solid ${C.border}`, color: C.cyan }}>
                      Total: {ringCells.length} · {fmt(ringCells.length * hexArea, 1)} km²
                    </div>
                  </div>
                )}
                {ringCells.length > 0 && <button onClick={clearRings} className="text-[11px]" style={{ color: C.textDim }}>Clear rings ×</button>}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="hxs-label mb-1">Origin</div>
                  <div className="grid grid-cols-2 gap-1">
                    <input className="hxs-input hxs-mono" style={{ fontSize: 11 }} placeholder="Lat" value={originLat} onChange={(e) => setOriginLat(e.target.value)} />
                    <input className="hxs-input hxs-mono" style={{ fontSize: 11 }} placeholder="Lng" value={originLng} onChange={(e) => setOriginLng(e.target.value)} />
                  </div>
                  <button
                    onClick={() => setPickMode((v) => !v)}
                    className="mt-1 text-[11px] flex items-center gap-1"
                    style={{ color: pickMode ? C.cyan : C.textDim }}
                  >
                    <Crosshair className="w-3 h-3" /> {pickMode ? "Click map to set origin..." : "Pick on map"}
                  </button>
                </div>
                <div>
                  <div className="hxs-label mb-1">K = <span className="hxs-mono" style={{ color: C.cyan, fontSize: 16 }}>{kNN}</span></div>
                  <div className="flex items-center gap-1">
                    <button className="hxs-btn-ghost" onClick={() => setKNN(Math.max(1, kNN - 1))}>−</button>
                    <input type="number" className="hxs-input hxs-mono text-center" value={kNN} min={1} max={500} onChange={(e) => setKNN(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))} />
                    <button className="hxs-btn-ghost" onClick={() => setKNN(Math.min(500, kNN + 1))}>+</button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={radiusOn} onChange={(e) => setRadiusOn(e.target.checked)} /> Cap by radius
                </label>
                {radiusOn && (
                  <div>
                    <div className="text-[11px] hxs-mono" style={{ color: C.textDim }}>Radius: {radiusKm.toFixed(1)} km</div>
                    <input type="range" className="hxs-slider w-full" min={0.1} max={50} step={0.1} value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))} />
                  </div>
                )}
                <button onClick={runKNN} className="hxs-btn w-full">Find K Nearest</button>
                {nnResults.length > 0 && <button onClick={clearNN} className="text-[11px]" style={{ color: C.textDim }}>Clear results ×</button>}
              </div>
            )}
          </Section>

          {/* Viz */}
          <Section title="4. Visualization">
            <div className="hxs-label mb-1">Color ramp</div>
            <select className="hxs-input" value={rampKey} onChange={(e) => setRampKey(e.target.value as any)}>
              {Object.entries(RAMPS).map(([k, r]) => <option key={k} value={k}>{r.name}</option>)}
            </select>
            <div className="h-2 rounded mt-1" style={{ background: rampCss(RAMPS[rampKey]) }} />

            <div className="mt-3">
              <div className="hxs-label mb-1">Opacity: {opacity}%</div>
              <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))} className="hxs-slider w-full" />
            </div>

            <label className="flex items-center gap-2 mt-3 text-[12px]">
              <input type="checkbox" checked={extrude} onChange={(e) => setExtrude(e.target.checked)} /> 3D extrusion
            </label>
            {extrude && (
              <div className="mt-1">
                <div className="text-[11px] hxs-mono" style={{ color: C.textDim }}>Height: {extMult}×</div>
                <input type="range" min={1} max={10} value={extMult} onChange={(e) => setExtMult(parseInt(e.target.value))} className="hxs-slider w-full" />
              </div>
            )}

            <div className="mt-3">
              <div className="hxs-label mb-1">Aggregation</div>
              <select className="hxs-input" value={agg} onChange={(e) => setAgg(e.target.value as Agg)}>
                <option value="count">Count</option><option value="sum">Sum</option>
                <option value="avg">Average</option><option value="max">Max</option><option value="min">Min</option>
              </select>
            </div>

            <div className="mt-3">
              <div className="hxs-label mb-1">Min points per hex: {minCount}</div>
              <input type="range" min={1} max={50} value={minCount} onChange={(e) => setMinCount(parseInt(e.target.value))} className="hxs-slider w-full" />
            </div>
          </Section>
        </div>

        {/* MAP */}
        <div className="relative flex-1" style={{ background: C.map }}>
          <div ref={mapContainer} className="absolute inset-0" />
          <canvas id="hex-deck-canvas" className="absolute inset-0 pointer-events-auto" />

          {!points.length && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <Hexagon className="w-16 h-16 mb-3" style={{ color: C.border }} />
              <div className="text-[20px] font-semibold mb-1">Drop a CSV to begin</div>
              <div className="text-[13px]" style={{ color: C.textDim }}>or load the sample dataset from the left panel</div>
            </div>
          )}

          {hoverInfo && (
            <div
              className="absolute pointer-events-none rounded px-3 py-2 hxs-mono text-[11px] z-50"
              style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12, background: C.panel, border: `1px solid ${C.border}`, color: C.text }}
            >
              <div style={{ color: C.cyan }}>{hoverInfo.bin.hex}</div>
              <div>count: {hoverInfo.bin.count}</div>
              <div>avg: {fmt(hoverInfo.bin.avg, 2)}</div>
              <div style={{ color: C.textDim }}>res {resolution}</div>
            </div>
          )}

          {/* Map controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-40">
            <MapBtn onClick={() => mapRef.current?.zoomIn()} title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></MapBtn>
            <MapBtn onClick={() => mapRef.current?.zoomOut()} title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></MapBtn>
            <MapBtn onClick={flyToData} title="Reset"><Maximize2 className="w-3.5 h-3.5" /></MapBtn>
            <MapBtn onClick={() => setIs3D((v) => !v)} title="2D/3D" active={is3D}><Box className="w-3.5 h-3.5" /></MapBtn>
            <MapBtn onClick={() => setShowLabels((v) => !v)} title="Labels" active={showLabels}><Type className="w-3.5 h-3.5" /></MapBtn>
            <MapBtn onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: is3D ? 40 : 0 })} title="North"><Compass className="w-3.5 h-3.5" /></MapBtn>
          </div>

          {/* Legend */}
          {stats.arr.length > 0 && (
            <div className="absolute bottom-3 left-3 rounded p-2 z-40" style={{ background: C.panel + "ee", border: `1px solid ${C.border}` }}>
              <div className="text-[10px] hxs-label mb-1">{agg}</div>
              <div className="h-2 w-32 rounded" style={{ background: rampCss(RAMPS[rampKey]) }} />
              <div className="flex justify-between hxs-mono text-[10px] mt-1" style={{ color: C.textDim }}>
                <span>{fmt(stats.min, 1)}</span><span>{fmt(stats.max, 1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hxs-scroll overflow-y-auto" style={{ width: 300, background: C.panel, borderLeft: `1px solid ${C.border}` }}>
          <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
            <MousePointer2 className="w-4 h-4" style={{ color: C.cyan }} />
            <div className="font-semibold text-[14px]">Inspector</div>
          </div>

          {nnResults.length > 0 ? (
            <div className="p-3">
              <div className="text-[13px] font-semibold mb-1">K-Nearest Results</div>
              <div className="text-[11px] mb-3" style={{ color: C.textDim }}>K={nnResults.length} points found</div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                <Card label="Nearest" value={`${nnResults[0].dist.toFixed(2)} km`} />
                <Card label="Farthest" value={`${nnResults[nnResults.length - 1].dist.toFixed(2)} km`} />
                <Card label="Median" value={`${nnResults[Math.floor(nnResults.length / 2)].dist.toFixed(2)} km`} />
                <Card label="Count" value={String(nnResults.length)} />
              </div>
              <div className="hxs-scroll overflow-y-auto" style={{ maxHeight: 360 }}>
                <table className="w-full hxs-mono text-[11px]">
                  <thead style={{ color: C.textDim }}>
                    <tr><th className="text-left">#</th><th className="text-left">Distance</th><th className="text-left">Lat,Lng</th></tr>
                  </thead>
                  <tbody>
                    {nnResults.map((r) => {
                      const t = 1 - (r.rank - 1) / Math.max(1, nnResults.length - 1);
                      return (
                        <tr key={r.rank} className="cursor-pointer hover:bg-[#1e2d45]" onClick={() => mapRef.current?.flyTo({ center: [r.pt.lng, r.pt.lat], zoom: 13 })}>
                          <td className="py-1">{r.rank}</td>
                          <td style={{ color: C.cyan }}>{r.dist.toFixed(2)} km</td>
                          <td>{r.pt.lat.toFixed(3)},{r.pt.lng.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={exportNN} className="hxs-btn-ghost w-full mt-2 flex items-center justify-center gap-1"><Download className="w-3 h-3" /> Export CSV</button>
            </div>
          ) : selectedBin ? (
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Hexagon className="w-6 h-6" style={{ color: C.cyan }} />
                <div className="flex-1 min-w-0">
                  <div className="hxs-mono text-[11px] truncate">{selectedBin.hex}</div>
                  <button onClick={() => copy(selectedBin.hex, "hex")} className="text-[10px] flex items-center gap-1" style={{ color: C.textDim }}>
                    {copied === "hex" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} copy
                  </button>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] hxs-mono" style={{ background: C.input, color: C.cyan }}>Res {resolution}</span>
              </div>
              <div>
                <div className="hxs-label">Point count</div>
                <div className="hxs-mono text-[28px] font-bold" style={{ color: C.cyan }}>{fmt(selectedBin.count, 0)}</div>
              </div>
              {valCol && (
                <div className="grid grid-cols-3 gap-1">
                  <Card label="Min" value={fmt(selectedBin.min, 2)} />
                  <Card label="Max" value={fmt(selectedBin.max, 2)} />
                  <Card label="Avg" value={fmt(selectedBin.avg, 2)} />
                </div>
              )}
              {(() => {
                const [la, ln] = cellToLatLng(selectedBin.hex);
                return (
                  <div>
                    <div className="hxs-label mb-1">Center</div>
                    <div className="hxs-mono text-[12px]">{la.toFixed(5)}, {ln.toFixed(5)}</div>
                    <button onClick={() => copy(`${la},${ln}`, "ctr")} className="text-[10px] flex items-center gap-1" style={{ color: C.textDim }}>
                      {copied === "ctr" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} copy
                    </button>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-1">
                <Card label="Area" value={`${fmt(hexArea, hexArea < 1 ? 3 : 2)} km²`} />
                <Card label="Edge" value={`${fmt(hexEdge, 2)} km`} />
              </div>
              <div className="text-[12px]">
                <div className="hxs-label mb-1">Hierarchy</div>
                {resolution > 0 && (() => {
                  const parent = cellToParent(selectedBin.hex, resolution - 1);
                  return (
                    <div className="flex justify-between items-center hxs-mono text-[11px] mb-1">
                      <span>Parent (res {resolution - 1})</span>
                      <button style={{ color: C.cyan }} onClick={() => { setSelectedHex(parent); setResolution(resolution - 1); }}>→ go</button>
                    </div>
                  );
                })()}
                {resolution < 15 && (
                  <div className="flex justify-between items-center hxs-mono text-[11px]">
                    <span>{cellToChildren(selectedBin.hex, resolution + 1).length} children</span>
                    <button style={{ color: C.cyan }} onClick={() => setResolution(resolution + 1)}>Show →</button>
                  </div>
                )}
              </div>

              <div>
                <div className="hxs-label mb-1">Points in hex ({selectedBin.points.length})</div>
                <div className="hxs-scroll overflow-y-auto rounded" style={{ maxHeight: 160, background: C.input }}>
                  <table className="w-full hxs-mono text-[10px]">
                    <tbody>
                      {selectedBin.points.map((p, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: C.border }}>
                          <td className="px-2 py-1">{p.lat.toFixed(4)}</td>
                          <td className="px-2 py-1">{p.lng.toFixed(4)}</td>
                          {valCol && <td className="px-2 py-1" style={{ color: C.cyan }}>{p.value ?? ""}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-1">
                <Card label="Total points" value={fmt(points.length, 0)} />
                <Card label="Active hexes" value={fmt(totalHexes, 0)} />
                <Card label="Densest" value={fmt(densest, 0)} />
                <Card label="Coverage" value={`${fmt(coverage, 1)} km²`} />
              </div>

              {distribution.length > 0 && (
                <div>
                  <div className="hxs-label mb-1">Distribution</div>
                  <svg viewBox="0 0 100 40" className="w-full h-20" preserveAspectRatio="none">
                    {distribution.map((v, i) => {
                      const max = Math.max(...distribution);
                      const h = (v / max) * 36;
                      return <rect key={i} x={i * 10} y={40 - h} width={8} height={h} fill={C.cyan} opacity={0.7} />;
                    })}
                  </svg>
                </div>
              )}

              {top5.length > 0 && (
                <div>
                  <div className="hxs-label mb-1">Top 5 hotspots</div>
                  <div className="space-y-1">
                    {top5.map((b, i) => {
                      const max = top5[0].count;
                      return (
                        <button
                          key={b.hex}
                          onClick={() => {
                            setSelectedHex(b.hex);
                            const [la, ln] = cellToLatLng(b.hex);
                            mapRef.current?.flyTo({ center: [ln, la], zoom: Math.max(11, resolution + 3) });
                          }}
                          className="w-full flex items-center gap-2 text-[11px] hxs-mono p-1.5 rounded hover:bg-[#1e2d45]"
                        >
                          <span style={{ color: C.textDim, width: 16 }}>#{i + 1}</span>
                          <span className="truncate flex-1 text-left">{b.hex.slice(0, 10)}…</span>
                          <span style={{ color: C.cyan }}>{b.count}</span>
                          <div className="w-10 h-1.5 rounded" style={{ background: C.border }}>
                            <div className="h-full rounded" style={{ width: `${(b.count / max) * 100}%`, background: C.cyan }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowHelp(false)}>
          <div className="rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto hxs-scroll" style={{ background: C.panel, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
              <h2 className="text-[18px] font-semibold">How to use HexScope</h2>
              <button onClick={() => setShowHelp(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 text-[13px]" style={{ color: C.text }}>
              <Doc title="Upload data">CSV or JSON with latitude/longitude columns. Optional value column for aggregation.</Doc>
              <Doc title="H3 Resolution">Controls hex size. Res 1 = continents, Res 12 = buildings. Use the slider to find the right level.</Doc>
              <Doc title="K-Ring search">Select a center hex, choose ring distance K, find all neighbors up to K rings out.</Doc>
              <Doc title="K-Nearest">Find the K closest data points to any location. Set origin manually or click on map.</Doc>
              <Doc title="Visualization">Pick a color ramp, opacity, aggregation (count/sum/avg/min/max) and 3D extrusion.</Doc>
              <Doc title="Keyboard shortcuts">
                <table className="hxs-mono text-[12px] w-full mt-1">
                  <tbody>
                    <tr><td>+/−</td><td>Change resolution</td></tr>
                    <tr><td>R</td><td>Reset to data extent</td></tr>
                    <tr><td>T</td><td>Toggle 2D/3D</td></tr>
                    <tr><td>Esc</td><td>Deselect / clear</td></tr>
                  </tbody>
                </table>
              </Doc>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------ small helpers ------------ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b" style={{ borderColor: C.border }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-semibold">
        <span>{title}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-1.5" style={{ background: C.input }}>
      <div className="text-[10px]" style={{ color: C.textDim }}>{label}</div>
      <div className="hxs-mono text-[11px]" style={{ color: C.text }}>{value}</div>
    </div>
  );
}
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-2" style={{ background: C.input }}>
      <div className="text-[10px]" style={{ color: C.textDim }}>{label}</div>
      <div className="hxs-mono text-[14px] font-semibold" style={{ color: C.text }}>{value}</div>
    </div>
  );
}
function ColPick({ label, cols, value, onChange }: { label: string; cols: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px]" style={{ color: C.textDim }}>{label}</div>
      <select className="hxs-input" style={{ fontSize: 11, padding: "4px 6px" }} value={value} onChange={(e) => onChange(e.target.value)}>
        {cols.map((c) => <option key={c} value={c}>{c || "None"}</option>)}
      </select>
    </div>
  );
}
function MapBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      className="w-8 h-8 flex items-center justify-center rounded transition"
      style={{ background: active ? C.cyan : C.panel, color: active ? C.bg : C.text, border: `1px solid ${C.border}` }}
    >{children}</button>
  );
}
function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-semibold text-[14px] mb-1" style={{ color: C.cyan }}>{title}</div>
      <div className="text-[13px]" style={{ color: C.text }}>{children}</div>
    </div>
  );
}
