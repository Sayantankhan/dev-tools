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

// ---------------- Default architecture ----------------
const initialNodes: SimNode[] = [
  { id: "users", label: "Users", kind: "users", x: 60, y: 220, capacityRps: 1e9, baseLatencyMs: 0, costPerHour: 0, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "cdn", label: "CDN", kind: "cdn", x: 220, y: 220, capacityRps: 200000, baseLatencyMs: 5, costPerHour: 0.40, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "lb", label: "Load Balancer", kind: "lb", x: 400, y: 220, capacityRps: 50000, baseLatencyMs: 2, costPerHour: 0.25, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "api", label: "API Service", kind: "api", x: 600, y: 120, capacityRps: 8000, baseLatencyMs: 20, costPerHour: 1.20, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "auth", label: "Auth Service", kind: "auth", x: 600, y: 320, capacityRps: 6000, baseLatencyMs: 15, costPerHour: 0.60, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "cache", label: "Redis Cache", kind: "cache", x: 820, y: 60, capacityRps: 20000, baseLatencyMs: 1, costPerHour: 0.30, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "db", label: "Postgres", kind: "db", x: 820, y: 220, capacityRps: 3000, baseLatencyMs: 8, costPerHour: 0.95, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
  { id: "queue", label: "Kafka", kind: "queue", x: 820, y: 380, capacityRps: 15000, baseLatencyMs: 4, costPerHour: 0.55, incomingRps: 0, servedRps: 0, queue: 0, errors: 0, latencyMs: 0, failed: false },
];

const initialEdges: SimEdge[] = [
  { id: "e1", from: "users", to: "cdn", weight: 1 },
  { id: "e2", from: "cdn", to: "lb", weight: 0.4 }, // 60% cached at CDN
  { id: "e3", from: "lb", to: "api", weight: 0.7 },
  { id: "e4", from: "lb", to: "auth", weight: 0.3 },
  { id: "e5", from: "api", to: "cache", weight: 0.7 },
  { id: "e6", from: "api", to: "db", weight: 0.3 },
  { id: "e7", from: "auth", to: "db", weight: 0.5 },
  { id: "e8", from: "api", to: "queue", weight: 0.2 },
];

const NODE_ICONS: Record<NodeKind, string> = {
  users: "👥", cdn: "🌐", lb: "⚖️", api: "🔌", auth: "🔐",
  cache: "⚡", db: "🗄️", queue: "📨", worker: "⚙️",
};

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

function loadColor(load: number, failed: boolean): string {
  if (failed) return "#6b7280";
  if (load < 0.5) return "hsl(var(--success))";
  if (load < 0.8) return "#eab308";
  if (load < 1.0) return "#f97316";
  return "hsl(var(--destructive))";
}

// ---------------- Component ----------------
export function TrafficSimulatorTool() {
  const [nodes, setNodes] = useState<SimNode[]>(() => initialNodes.map(n => ({ ...n })));
  const [edges] = useState<SimEdge[]>(initialEdges);
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

      // BFS-ish propagation from users
      const order = ["users", "cdn", "lb", "api", "auth", "cache", "db", "queue"];
      const usersNode = map.get("users")!;
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
      const apiNode = map.get("api")!;
      const totalLatency = updated.reduce((s, n) => s + n.latencyMs * (n.servedRps / Math.max(1, apiNode.servedRps || 1)), 0);
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
