import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Zap, AlertTriangle, Activity, DollarSign, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------- Types ----------------
type NodeKind =
  | "users" | "cdn" | "lb" | "api" | "auth" | "cache" | "db" | "queue" | "worker"
  | "broker" | "publisher" | "subscriber" | "stream" | "stun" | "turn" | "media"
  | "gameserver" | "matchmaker" | "etl" | "warehouse" | "analytics" | "ml";

interface SimNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  capacityRps: number;       // max RPS it can handle
  baseLatencyMs: number;     // latency at no load
  costPerHour: number;       // $ / hr
  // runtime
  incomingRps: number;
  servedRps: number;
  queue: number;
  errors: number;
  latencyMs: number;
  failed: boolean;
}

interface SimEdge {
  id: string;
  from: string;
  to: string;
  weight: number; // 0..1 of upstream traffic going through this edge
}

type Pattern = "constant" | "spike" | "linear" | "flash" | "ddos";

const PATTERN_LABEL: Record<Pattern, string> = {
  constant: "Constant", spike: "Spike", linear: "Linear Growth",
  flash: "Flash Sale", ddos: "DDoS Attack",
};

function computePatternRps(base: number, pattern: Pattern, tSec: number): number {
  switch (pattern) {
    case "constant": return base;
    case "linear":   return base * (1 + tSec / 30);
    case "spike":    return base * (1 + 4 * Math.exp(-Math.pow((tSec % 30) - 10, 2) / 8));
    case "flash":    return tSec < 5 ? base * 0.3 : base * (1.5 + 2 * Math.sin(tSec / 3));
    case "ddos":     return base * (1 + 8 * Math.min(1, tSec / 10));
  }
}


type ArchKey = "web3tier" | "pubsub" | "streaming" | "videocall" | "gameserver" | "async" | "analytics";

function mkNode(id: string, label: string, kind: NodeKind, x: number, y: number, cap: number, lat: number, cost: number): SimNode {
  return { id, label, kind, x, y, capacityRps: cap, baseLatencyMs: lat, costPerHour: cost, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false };
}

interface Architecture {
  label: string;
  description: string;
  nodes: SimNode[];
  edges: SimEdge[];
  entryId: string; // node that receives user traffic
  order: string[]; // BFS-ish propagation order
}

const ARCHITECTURES: Record<ArchKey, Architecture> = {
  web3tier: {
    label: "Web 3-Tier",
    description: "Classic CDN → LB → API → DB stack",
    nodes: [
      mkNode("users", "Users", "users", 60, 220, 1e9, 0, 0),
      mkNode("cdn", "CDN", "cdn", 220, 220, 200000, 5, 0.40),
      mkNode("lb", "Load Balancer", "lb", 400, 220, 50000, 2, 0.25),
      mkNode("api", "API Service", "api", 600, 120, 8000, 20, 1.20),
      mkNode("auth", "Auth Service", "auth", 600, 320, 6000, 15, 0.60),
      mkNode("cache", "Redis Cache", "cache", 820, 60, 20000, 1, 0.30),
      mkNode("db", "Postgres", "db", 820, 220, 3000, 8, 0.95),
      mkNode("queue", "Kafka", "queue", 820, 380, 15000, 4, 0.55),
    ],
    edges: [
      { id: "e1", from: "users", to: "cdn", weight: 1 },
      { id: "e2", from: "cdn", to: "lb", weight: 0.4 },
      { id: "e3", from: "lb", to: "api", weight: 0.7 },
      { id: "e4", from: "lb", to: "auth", weight: 0.3 },
      { id: "e5", from: "api", to: "cache", weight: 0.7 },
      { id: "e6", from: "api", to: "db", weight: 0.3 },
      { id: "e7", from: "auth", to: "db", weight: 0.5 },
      { id: "e8", from: "api", to: "queue", weight: 0.2 },
    ],
    entryId: "users",
    order: ["users", "cdn", "lb", "api", "auth", "cache", "db", "queue"],
  },
  pubsub: {
    label: "Pub/Sub",
    description: "Publishers → Broker → Subscribers (fan-out)",
    nodes: [
      mkNode("users", "Producers", "users", 60, 220, 1e9, 0, 0),
      mkNode("pub", "Publisher API", "publisher", 220, 220, 30000, 5, 0.50),
      mkNode("broker", "Message Broker", "broker", 420, 220, 50000, 3, 1.10),
      mkNode("sub1", "Email Subscriber", "subscriber", 660, 80, 4000, 25, 0.40),
      mkNode("sub2", "Analytics Subscriber", "subscriber", 660, 220, 8000, 15, 0.55),
      mkNode("sub3", "Webhook Subscriber", "subscriber", 660, 360, 5000, 30, 0.45),
      mkNode("dlq", "Dead Letter Queue", "queue", 420, 400, 10000, 2, 0.20),
    ],
    edges: [
      { id: "e1", from: "users", to: "pub", weight: 1 },
      { id: "e2", from: "pub", to: "broker", weight: 1 },
      { id: "e3", from: "broker", to: "sub1", weight: 1 },
      { id: "e4", from: "broker", to: "sub2", weight: 1 },
      { id: "e5", from: "broker", to: "sub3", weight: 1 },
      { id: "e6", from: "broker", to: "dlq", weight: 0.05 },
    ],
    entryId: "users",
    order: ["users", "pub", "broker", "sub1", "sub2", "sub3", "dlq"],
  },
  streaming: {
    label: "Streaming",
    description: "Kafka-style ingest → stream processors → sinks",
    nodes: [
      mkNode("users", "Event Sources", "users", 60, 220, 1e9, 0, 0),
      mkNode("ingest", "Ingest Gateway", "api", 220, 220, 80000, 4, 0.70),
      mkNode("kafka", "Kafka Cluster", "stream", 420, 220, 200000, 2, 2.50),
      mkNode("flink", "Flink Job", "worker", 640, 120, 30000, 10, 1.80),
      mkNode("spark", "Spark Job", "worker", 640, 320, 20000, 20, 1.60),
      mkNode("warehouse", "Warehouse", "warehouse", 860, 120, 15000, 30, 1.20),
      mkNode("dash", "Realtime Dashboard", "analytics", 860, 320, 10000, 5, 0.40),
    ],
    edges: [
      { id: "e1", from: "users", to: "ingest", weight: 1 },
      { id: "e2", from: "ingest", to: "kafka", weight: 1 },
      { id: "e3", from: "kafka", to: "flink", weight: 0.6 },
      { id: "e4", from: "kafka", to: "spark", weight: 0.4 },
      { id: "e5", from: "flink", to: "warehouse", weight: 1 },
      { id: "e6", from: "spark", to: "dash", weight: 1 },
    ],
    entryId: "users",
    order: ["users", "ingest", "kafka", "flink", "spark", "warehouse", "dash"],
  },
  videocall: {
    label: "Video Call (WebRTC)",
    description: "Signaling, STUN/TURN relays, SFU media",
    nodes: [
      mkNode("users", "Peers", "users", 60, 220, 1e9, 0, 0),
      mkNode("signal", "Signaling Server", "api", 240, 220, 20000, 10, 0.50),
      mkNode("stun", "STUN", "stun", 460, 80, 50000, 5, 0.20),
      mkNode("turn", "TURN Relay", "turn", 460, 240, 8000, 25, 1.50),
      mkNode("sfu", "SFU Media Server", "media", 460, 400, 5000, 15, 2.20),
      mkNode("recorder", "Recording Service", "worker", 720, 320, 2000, 40, 1.00),
      mkNode("storage", "Object Storage", "db", 720, 460, 10000, 30, 0.60),
    ],
    edges: [
      { id: "e1", from: "users", to: "signal", weight: 1 },
      { id: "e2", from: "signal", to: "stun", weight: 0.8 },
      { id: "e3", from: "signal", to: "turn", weight: 0.3 },
      { id: "e4", from: "signal", to: "sfu", weight: 0.6 },
      { id: "e5", from: "sfu", to: "recorder", weight: 0.2 },
      { id: "e6", from: "recorder", to: "storage", weight: 1 },
    ],
    entryId: "users",
    order: ["users", "signal", "stun", "turn", "sfu", "recorder", "storage"],
  },
  gameserver: {
    label: "Game Servers",
    description: "Matchmaker → game instances → state store",
    nodes: [
      mkNode("users", "Players", "users", 60, 220, 1e9, 0, 0),
      mkNode("lb", "Edge LB", "lb", 220, 220, 100000, 3, 0.40),
      mkNode("matchmaker", "Matchmaker", "matchmaker", 400, 100, 10000, 50, 0.80),
      mkNode("lobby", "Lobby Service", "api", 400, 340, 15000, 20, 0.60),
      mkNode("game1", "Game Instance A", "gameserver", 620, 80, 3000, 30, 1.80),
      mkNode("game2", "Game Instance B", "gameserver", 620, 220, 3000, 30, 1.80),
      mkNode("game3", "Game Instance C", "gameserver", 620, 360, 3000, 30, 1.80),
      mkNode("state", "State Store (Redis)", "cache", 840, 220, 40000, 1, 0.50),
      mkNode("db", "Player DB", "db", 840, 360, 5000, 10, 0.95),
    ],
    edges: [
      { id: "e1", from: "users", to: "lb", weight: 1 },
      { id: "e2", from: "lb", to: "matchmaker", weight: 0.4 },
      { id: "e3", from: "lb", to: "lobby", weight: 0.6 },
      { id: "e4", from: "matchmaker", to: "game1", weight: 0.35 },
      { id: "e5", from: "matchmaker", to: "game2", weight: 0.35 },
      { id: "e6", from: "matchmaker", to: "game3", weight: 0.3 },
      { id: "e7", from: "game1", to: "state", weight: 1 },
      { id: "e8", from: "game2", to: "state", weight: 1 },
      { id: "e9", from: "game3", to: "state", weight: 1 },
      { id: "e10", from: "lobby", to: "db", weight: 0.7 },
    ],
    entryId: "users",
    order: ["users", "lb", "matchmaker", "lobby", "game1", "game2", "game3", "state", "db"],
  },
  async: {
    label: "Async Processing",
    description: "API → queue → workers → DB",
    nodes: [
      mkNode("users", "Clients", "users", 60, 220, 1e9, 0, 0),
      mkNode("api", "REST API", "api", 220, 220, 25000, 10, 0.80),
      mkNode("queue", "Job Queue", "queue", 420, 220, 100000, 2, 0.40),
      mkNode("w1", "Worker Pool A", "worker", 640, 100, 5000, 100, 1.20),
      mkNode("w2", "Worker Pool B", "worker", 640, 240, 5000, 100, 1.20),
      mkNode("w3", "Worker Pool C", "worker", 640, 380, 5000, 100, 1.20),
      mkNode("db", "Result DB", "db", 860, 240, 8000, 8, 0.90),
      mkNode("notify", "Notifier", "api", 860, 380, 12000, 15, 0.50),
    ],
    edges: [
      { id: "e1", from: "users", to: "api", weight: 1 },
      { id: "e2", from: "api", to: "queue", weight: 1 },
      { id: "e3", from: "queue", to: "w1", weight: 0.34 },
      { id: "e4", from: "queue", to: "w2", weight: 0.33 },
      { id: "e5", from: "queue", to: "w3", weight: 0.33 },
      { id: "e6", from: "w1", to: "db", weight: 1 },
      { id: "e7", from: "w2", to: "db", weight: 1 },
      { id: "e8", from: "w3", to: "notify", weight: 1 },
    ],
    entryId: "users",
    order: ["users", "api", "queue", "w1", "w2", "w3", "db", "notify"],
  },
  analytics: {
    label: "Data Analytics",
    description: "Sources → ETL → warehouse → BI/ML",
    nodes: [
      mkNode("users", "Data Sources", "users", 60, 220, 1e9, 0, 0),
      mkNode("ingest", "Ingestion", "api", 220, 220, 40000, 5, 0.60),
      mkNode("etl", "ETL Pipeline", "etl", 420, 220, 15000, 60, 1.50),
      mkNode("lake", "Data Lake (S3)", "db", 640, 100, 30000, 20, 0.50),
      mkNode("wh", "Warehouse (Snowflake)", "warehouse", 640, 260, 8000, 40, 2.50),
      mkNode("bi", "BI Dashboards", "analytics", 860, 180, 5000, 100, 0.80),
      mkNode("ml", "ML Training", "ml", 860, 340, 2000, 200, 3.00),
    ],
    edges: [
      { id: "e1", from: "users", to: "ingest", weight: 1 },
      { id: "e2", from: "ingest", to: "etl", weight: 1 },
      { id: "e3", from: "etl", to: "lake", weight: 0.7 },
      { id: "e4", from: "etl", to: "wh", weight: 0.5 },
      { id: "e5", from: "wh", to: "bi", weight: 0.8 },
      { id: "e6", from: "lake", to: "ml", weight: 0.4 },
    ],
    entryId: "users",
    order: ["users", "ingest", "etl", "lake", "wh", "bi", "ml"],
  },
};

const NODE_ICONS: Record<NodeKind, string> = {
  users: "👥", cdn: "🌐", lb: "⚖️", api: "🔌", auth: "🔐",
  cache: "⚡", db: "🗄️", queue: "📨", worker: "⚙️",
  broker: "📡", publisher: "📤", subscriber: "📥", stream: "🌊",
  stun: "🧊", turn: "🔁", media: "🎥",
  gameserver: "🎮", matchmaker: "🎯",
  etl: "🔄", warehouse: "🏬", analytics: "📊", ml: "🧠",
};

function loadColor(load: number, failed: boolean): string {
  if (failed) return "#6b7280";
  if (load < 0.5) return "hsl(var(--success))";
  if (load < 0.8) return "#eab308";
  if (load < 1.0) return "#f97316";
  return "hsl(var(--destructive))";
}

// ---------------- Component ----------------
export function TrafficSimulatorTool() {
  const [archKey, setArchKey] = useState<ArchKey>("web3tier");
  const arch = ARCHITECTURES[archKey];
  const [nodes, setNodes] = useState<SimNode[]>(() => arch.nodes.map(n => ({ ...n })));
  const [edges, setEdges] = useState<SimEdge[]>(arch.edges);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rps, setRps] = useState(5000);
  const [pattern, setPattern] = useState<Pattern>("constant");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<{ t: number; rps: number; latency: number; errors: number }[]>([]);

  const tickRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  // ---------- Simulation step ----------
  const step = useCallback(() => {
    elapsedRef.current += 1;
    const tSec = elapsedRef.current;
    setElapsed(tSec);

    setNodes(prev => {
      const map = new Map(prev.map(n => [n.id, { ...n, incomingRps: 0, servedRps: 0 }]));
      const targetUserRps = computePatternRps(rps, pattern, tSec);

      // BFS-ish propagation from entry
      const order = arch.order;
      const usersNode = map.get(arch.entryId)!;
      usersNode.incomingRps = targetUserRps;

      for (const id of order) {
        const node = map.get(id)!;
        if (node.failed) {
          node.servedRps = 0;
          node.queue += node.incomingRps * 0.2;
          node.errors = node.incomingRps;
          node.latencyMs = 0;
          continue;
        }
        const capacity = node.capacityRps;
        const totalDemand = node.incomingRps + node.queue * 0.3;
        const served = Math.min(capacity, totalDemand);
        node.servedRps = served;
        const overflow = Math.max(0, totalDemand - capacity);
        // queue drains by 30% per tick, grows by overflow
        node.queue = Math.max(0, node.queue * 0.7 + overflow * 0.5);
        node.errors = overflow;
        const load = served / Math.max(1, capacity);
        node.latencyMs = node.baseLatencyMs * (1 + Math.pow(load, 3) * 8) + node.queue * 0.02;

        // propagate served traffic to downstream
        const out = edges.filter(e => e.from === id);
        for (const e of out) {
          const tgt = map.get(e.to);
          if (tgt) tgt.incomingRps += served * e.weight;
        }
      }

      const updated = Array.from(map.values());

      // accumulate metrics
      const entryNode = map.get(arch.entryId)!;
      const totalLatency = updated.reduce((s, n) => s + n.latencyMs * (n.servedRps / Math.max(1, entryNode.servedRps || entryNode.incomingRps || 1)), 0);
      const totalErrors = updated.reduce((s, n) => s + n.errors, 0);
      setHistory(h => {
        const next = [...h, { t: tSec, rps: targetUserRps, latency: totalLatency, errors: totalErrors }];
        return next.length > 60 ? next.slice(-60) : next;
      });

      return updated;
    });
  }, [rps, pattern, edges]);

  useEffect(() => {
    if (!running) return;
    const interval = 1000 / speed;
    tickRef.current = window.setInterval(step, interval);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [running, speed, step]);

  const reset = () => {
    setRunning(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setHistory([]);
    setNodes(initialNodes.map(n => ({ ...n })));
  };

  const updateNode = (id: string, patch: Partial<SimNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  };

  // ---------- Derived ----------
  const selected = nodes.find(n => n.id === selectedId);
  const bottleneck = useMemo(() => {
    return [...nodes]
      .filter(n => n.id !== "users")
      .sort((a, b) => (b.servedRps / b.capacityRps) - (a.servedRps / a.capacityRps))[0];
  }, [nodes]);

  const totalCost = nodes.reduce((s, n) => s + n.costPerHour, 0);
  const totalServed = nodes.find(n => n.id === "users")?.incomingRps || 0;
  const totalErrors = nodes.reduce((s, n) => s + n.errors, 0);
  const avgLatency = history.length ? history[history.length - 1].latency : 0;

  const insights = useMemo(() => {
    const out: string[] = [];
    nodes.forEach(n => {
      const load = n.servedRps / n.capacityRps;
      if (load > 0.95 && n.id !== "users") out.push(`${n.label} is saturated (${Math.round(load * 100)}%). Consider scaling horizontally or increasing capacity.`);
      else if (n.queue > 500) out.push(`${n.label} has a queue of ${Math.round(n.queue)}. Backpressure is building.`);
    });
    if (out.length === 0) out.push("System is healthy. All components operating below 80% capacity.");
    return out.slice(0, 4);
  }, [nodes]);

  // ---------- Render ----------
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-background">
      {/* Top control bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/40 flex-wrap">
        <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning(r => !r)}>
          {running ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" />Reset
        </Button>

        <div className="flex items-center gap-2 ml-2 min-w-[200px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">RPS: {rps.toLocaleString()}</span>
          <Slider value={[rps]} min={100} max={50000} step={100} onValueChange={v => setRps(v[0])} className="w-32" />
        </div>

        <div className="flex items-center gap-1">
          {(Object.keys(PATTERN_LABEL) as Pattern[]).map(p => (
            <button
              key={p}
              onClick={() => setPattern(p)}
              className={`text-[11px] px-2 py-1 rounded border transition ${pattern === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >{PATTERN_LABEL[p]}</button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-2">
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-[11px] px-2 py-0.5 rounded border ${speed === s ? "bg-secondary border-border" : "border-transparent text-muted-foreground"}`}
            >{s}x</button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">t = <span className="text-foreground font-mono">{elapsed}s</span></span>
          <Badge variant={running ? "default" : "secondary"} className="gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
            {running ? "LIVE" : "Idle"}
          </Badge>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[1fr,320px] min-h-0">
        {/* Canvas */}
        <div className="relative overflow-auto bg-gradient-to-br from-background to-muted/20">
          <svg width={1000} height={500} className="block">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map(e => {
              const from = nodes.find(n => n.id === e.from)!;
              const to = nodes.find(n => n.id === e.to)!;
              const flow = from.servedRps * e.weight;
              const intensity = Math.min(1, flow / 5000);
              const stroke = loadColor(flow / to.capacityRps, to.failed);
              return (
                <g key={e.id}>
                  <line
                    x1={from.x + 60} y1={from.y + 30}
                    x2={to.x} y2={to.y + 30}
                    stroke={stroke}
                    strokeWidth={1 + intensity * 4}
                    opacity={0.3 + intensity * 0.7}
                    markerEnd="url(#arrow)"
                    style={{ transition: "all 0.3s" }}
                  />
                  {/* Animated particles */}
                  {running && flow > 50 && Array.from({ length: Math.min(5, Math.ceil(intensity * 5)) }).map((_, i) => (
                    <circle key={i} r={2.5} fill={stroke}>
                      <animateMotion
                        dur={`${Math.max(0.6, 2 - intensity * 1.2)}s`}
                        repeatCount="indefinite"
                        begin={`${(i * 0.3)}s`}
                        path={`M${from.x + 60},${from.y + 30} L${to.x},${to.y + 30}`}
                      />
                    </circle>
                  ))}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const load = n.servedRps / n.capacityRps;
              const color = loadColor(load, n.failed);
              const isSel = n.id === selectedId;
              const isBottle = bottleneck?.id === n.id && load > 0.8;
              return (
                <g key={n.id} onClick={() => setSelectedId(n.id)} style={{ cursor: "pointer" }}>
                  {isBottle && (
                    <rect x={n.x - 4} y={n.y - 4} width={128} height={68} rx={10}
                      fill="none" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 3" opacity={0.6}>
                      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                    </rect>
                  )}
                  <rect
                    x={n.x} y={n.y} width={120} height={60} rx={8}
                    fill="hsl(var(--card))"
                    stroke={isSel ? "hsl(var(--primary))" : color}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    style={{ transition: "stroke 0.3s" }}
                  />
                  <text x={n.x + 10} y={n.y + 22} fontSize={16}>{NODE_ICONS[n.kind]}</text>
                  <text x={n.x + 32} y={n.y + 22} fontSize={11} fill="hsl(var(--foreground))" fontWeight={600}>{n.label}</text>
                  <text x={n.x + 10} y={n.y + 40} fontSize={9} fill="hsl(var(--muted-foreground))" fontFamily="monospace">
                    {Math.round(n.servedRps).toLocaleString()} / {n.capacityRps.toLocaleString()} rps
                  </text>
                  <rect x={n.x + 10} y={n.y + 46} width={100} height={4} rx={2} fill="hsl(var(--muted))" />
                  <rect x={n.x + 10} y={n.y + 46} width={Math.min(100, load * 100)} height={4} rx={2} fill={color}
                    style={{ transition: "width 0.3s, fill 0.3s" }} />
                </g>
              );
            })}
          </svg>

          {/* Bottom metrics strip */}
          <div className="sticky bottom-0 left-0 right-0 grid grid-cols-4 gap-2 p-3 bg-background/95 backdrop-blur border-t border-border">
            <MetricCard label="Throughput" value={`${Math.round(totalServed).toLocaleString()} rps`} icon={Activity} />
            <MetricCard label="Avg Latency" value={`${avgLatency.toFixed(1)} ms`} icon={Zap} />
            <MetricCard label="Errors / sec" value={Math.round(totalErrors).toLocaleString()} icon={AlertTriangle} tone={totalErrors > 100 ? "danger" : "default"} />
            <MetricCard label="Cost / hour" value={`$${totalCost.toFixed(2)}`} icon={DollarSign} />
          </div>
        </div>

        {/* Right panel */}
        <div className="border-l border-border bg-card/30 overflow-y-auto">
          {/* Charts */}
          <div className="p-3 border-b border-border">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Throughput</div>
            <div className="h-20">
              <ResponsiveContainer><LineChart data={history}>
                <YAxis hide /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Line type="monotone" dataKey="rps" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart></ResponsiveContainer>
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-3">Latency (ms)</div>
            <div className="h-20">
              <ResponsiveContainer><LineChart data={history}>
                <YAxis hide /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Line type="monotone" dataKey="latency" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart></ResponsiveContainer>
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-3">Errors / sec</div>
            <div className="h-20">
              <ResponsiveContainer><LineChart data={history}>
                <YAxis hide /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart></ResponsiveContainer>
            </div>
          </div>

          {/* Bottleneck */}
          {bottleneck && bottleneck.servedRps / bottleneck.capacityRps > 0.7 && (
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2">
                <AlertTriangle className="w-3 h-3" /> Bottleneck
              </div>
              <Card className="p-3 border-destructive/40 bg-destructive/5">
                <div className="font-semibold text-sm">{bottleneck.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Load: {Math.round(bottleneck.servedRps).toLocaleString()} / {bottleneck.capacityRps.toLocaleString()} rps
                  ({Math.round(bottleneck.servedRps / bottleneck.capacityRps * 100)}%)
                </div>
                {bottleneck.queue > 10 && (
                  <div className="text-xs text-destructive mt-1">Queue: {Math.round(bottleneck.queue)} requests</div>
                )}
              </Card>
            </div>
          )}

          {/* AI insights */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3" /> AI Insights
            </div>
            <div className="space-y-1.5">
              {insights.map((s, i) => (
                <div key={i} className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">{s}</div>
              ))}
            </div>
          </div>

          {/* Config panel */}
          {selected && (
            <div className="p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configure: {selected.label}</div>
              <div className="space-y-3">
                <ConfigField label={`Capacity (RPS): ${selected.capacityRps.toLocaleString()}`}>
                  <Slider value={[selected.capacityRps]} min={100} max={50000} step={100}
                    onValueChange={v => updateNode(selected.id, { capacityRps: v[0] })} />
                </ConfigField>
                <ConfigField label={`Base Latency: ${selected.baseLatencyMs} ms`}>
                  <Slider value={[selected.baseLatencyMs]} min={0} max={200} step={1}
                    onValueChange={v => updateNode(selected.id, { baseLatencyMs: v[0] })} />
                </ConfigField>
                <ConfigField label={`Cost: $${selected.costPerHour.toFixed(2)}/hr`}>
                  <Slider value={[selected.costPerHour * 100]} min={0} max={500} step={5}
                    onValueChange={v => updateNode(selected.id, { costPerHour: v[0] / 100 })} />
                </ConfigField>
                <Button
                  size="sm"
                  variant={selected.failed ? "default" : "destructive"}
                  className="w-full"
                  onClick={() => updateNode(selected.id, { failed: !selected.failed, queue: 0 })}
                >
                  {selected.failed ? "Recover Service" : "Inject Failure"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: string | number; icon: any; tone?: "default" | "danger" }) {
  return (
    <Card className={`p-2.5 ${tone === "danger" ? "border-destructive/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className={`text-lg font-semibold font-mono mt-0.5 ${tone === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1.5 font-mono">{label}</div>
      {children}
    </div>
  );
}
