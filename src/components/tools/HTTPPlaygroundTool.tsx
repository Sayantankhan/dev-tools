import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ChevronDown,
  Loader2,
  Play,
  Plug,
  PlugZap,
  Plus,
  RotateCcw,
  Send,
  Square,
  Trash2,
  Waves,
  Radio,
  Timer,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Endpoints                                                            */
/* ------------------------------------------------------------------ */

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const ENDPOINTS = {
  echo: `${FN_BASE}/http-echo`,
  chunked: `${FN_BASE}/chunked-stream`,
  sse: `${FN_BASE}/sse-stream`,
  job: `${FN_BASE}/job-status`,
};

const withKey = (url: string) =>
  url + (url.includes("?") ? "&" : "?") + `apikey=${encodeURIComponent(ANON)}`;

/* ------------------------------------------------------------------ */
/* Shared primitives                                                    */
/* ------------------------------------------------------------------ */

type RunState = "idle" | "connecting" | "active" | "done" | "error";

const STATE_STYLES: Record<RunState, string> = {
  idle: "bg-muted text-muted-foreground",
  connecting: "bg-accent/20 text-accent border-accent/40",
  active: "bg-primary/15 text-primary border-primary/40",
  done: "bg-success/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/40",
  error: "bg-destructive/15 text-destructive border-destructive/40",
};

function StateBadge({ state, label }: { state: RunState; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider",
        STATE_STYLES[state],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          (state === "active" || state === "connecting") && "animate-pulse",
        )}
      />
      {label ?? state}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  state,
  children,
}: {
  title: string;
  subtitle: string;
  state?: RunState;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {state && <StateBadge state={state} />}
        {children}
      </div>
    </div>
  );
}

function Explainer({
  children,
  more,
}: {
  children: React.ReactNode;
  more?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm leading-relaxed text-muted-foreground">
      <div className="text-foreground/80">{children}</div>
      {more && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            {open ? "Show less" : "Learn more"}
          </button>
          {open && <div className="mt-3 space-y-2 border-t border-border/60 pt-3">{more}</div>}
        </>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "default",
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" && "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
        variant === "primary" && "border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "danger" && "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        variant === "ghost" && "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

const wireBox =
  "rounded-lg border border-border/60 bg-input font-mono text-xs leading-relaxed shadow-inner";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Methods & Headers                                                 */
/* ------------------------------------------------------------------ */

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
type Method = (typeof METHODS)[number];

const METHOD_INFO: Record<Method, string> = {
  GET: "Reads a resource. Safe and idempotent — it should never change server state and carries no request body.",
  POST: "Creates or submits. Not idempotent: sending it twice usually creates two things. Carries a body.",
  PUT: "Replaces a resource wholesale at a known URL. Idempotent — repeating it lands on the same final state. Carries a body.",
  PATCH: "Applies a partial update. Not guaranteed idempotent (depends on the patch format). Carries a body.",
  DELETE: "Removes a resource. Idempotent — deleting twice leaves it deleted. Body is unusual but allowed.",
  HEAD: "Exactly like GET but the server returns headers only, no body. Handy for cheap freshness/size checks.",
  OPTIONS: "Asks what the server allows. Browsers send it automatically as a CORS preflight before non-simple requests.",
};

type HeaderRow = { id: number; key: string; value: string; on: boolean };

function MethodsSection() {
  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState(ENDPOINTS.echo);
  const [rows, setRows] = useState<HeaderRow[]>([
    { id: 1, key: "X-Demo-Header", value: "hello-wire", on: true },
  ]);
  const [body, setBody] = useState('{\n  "hello": "world"\n}');
  const [state, setState] = useState<RunState>("idle");
  const [resp, setResp] = useState<{
    status: number;
    statusText: string;
    headers: [string, string][];
    body: string;
    ms: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(2);

  const bodyDisabled = method === "GET" || method === "HEAD" || method === "OPTIONS";

  const send = useCallback(
    async (override?: { headers?: Record<string, string>; method?: Method }) => {
      setState("connecting");
      setError(null);
      setResp(null);
      const headers: Record<string, string> = { apikey: ANON };
      rows.filter((r) => r.on && r.key.trim()).forEach((r) => (headers[r.key.trim()] = r.value));
      Object.assign(headers, override?.headers ?? {});
      const m = override?.method ?? method;
      const t0 = performance.now();
      try {
        const res = await fetch(url, {
          method: m,
          headers,
          body: m === "GET" || m === "HEAD" || m === "OPTIONS" ? undefined : body,
        });
        const text = m === "HEAD" ? "" : await res.text();
        const hs: [string, string][] = [];
        res.headers.forEach((v, k) => hs.push([k, v]));
        setResp({
          status: res.status,
          statusText: res.statusText,
          headers: hs.sort((a, b) => a[0].localeCompare(b[0])),
          body: text,
          ms: Math.round(performance.now() - t0),
        });
        setState("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    },
    [rows, url, method, body],
  );

  const reset = () => {
    setMethod("GET");
    setUrl(ENDPOINTS.echo);
    setRows([{ id: 1, key: "X-Demo-Header", value: "hello-wire", on: true }]);
    setBody('{\n  "hello": "world"\n}');
    setResp(null);
    setError(null);
    setState("idle");
  };

  const statusTone =
    !resp ? "" : resp.status < 300 ? "text-[hsl(var(--success))]" : resp.status < 400 ? "text-accent" : "text-destructive";

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Methods & Headers"
        subtitle="Build a request, send it to a echo endpoint, and read back exactly what arrived on the server."
        state={state}
      >
        <Btn onClick={reset} variant="ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Btn>
      </SectionHeader>

      <Explainer
        more={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <span className="font-mono text-foreground">Safe</span> methods (GET, HEAD, OPTIONS) must not change state.
              <span className="font-mono text-foreground"> Idempotent</span> methods can be retried without extra effect.
            </li>
            <li>
              Browsers send an <span className="font-mono text-foreground">OPTIONS</span> preflight before cross-origin
              requests that use custom headers or non-simple methods, then cache the answer for{" "}
              <span className="font-mono text-foreground">Access-Control-Max-Age</span> seconds.
            </li>
            <li>
              Conditional requests: the server returns an <span className="font-mono text-foreground">ETag</span>; you send it
              back as <span className="font-mono text-foreground">If-None-Match</span> and get an empty{" "}
              <span className="font-mono text-foreground">304 Not Modified</span> instead of the body.
            </li>
          </ul>
        }
      >
        Every HTTP request is a method + a URL + headers (+ maybe a body). The echo function below mirrors all of it back, so
        you can see precisely what the wire carried.
      </Explainer>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Request builder */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Request</div>
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="rounded-lg border border-border bg-input px-2 py-2 font-mono text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 font-mono text-xs shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
            <span className="font-mono text-foreground">{method}</span> — {METHOD_INFO[method]}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Headers</span>
              <Btn
                variant="ghost"
                onClick={() => setRows((r) => [...r, { id: nextId.current++, key: "", value: "", on: true }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Btn>
            </div>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={r.on}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, on: e.target.checked } : x)))
                    }
                    className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                  />
                  <input
                    value={r.key}
                    placeholder="Header"
                    onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)))}
                    className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    value={r.value}
                    placeholder="Value"
                    onChange={(e) =>
                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))
                    }
                    className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Btn variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Body {bodyDisabled && <span className="normal-case tracking-normal">— not sent with {method}</span>}
            </div>
            <textarea
              value={body}
              disabled={bodyDisabled}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              rows={5}
              className="w-full rounded-lg border border-border bg-input p-3 font-mono text-xs shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Btn variant="primary" onClick={() => send()} disabled={state === "connecting"}>
              {state === "connecting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Btn>
            <Btn onClick={() => send({ headers: { "If-None-Match": '"http-playground-demo-v1"' } })}>
              Try: If-None-Match → 304
            </Btn>
            <Btn
              onClick={() => {
                setMethod("POST");
                send({ method: "POST", headers: { "Content-Type": "application/vnd.demo+json" } });
              }}
            >
              Try: custom Content-Type
            </Btn>
            <Btn onClick={() => { setMethod("OPTIONS"); send({ method: "OPTIONS" }); }}>Try: OPTIONS preflight</Btn>
          </div>
        </div>

        {/* Response */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Response</span>
            {resp && (
              <span className="font-mono text-xs text-muted-foreground">
                <span className={cn("font-semibold", statusTone)}>
                  {resp.status} {resp.statusText}
                </span>{" "}
                · {resp.ms}ms
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              {error}
            </div>
          )}

          {!resp && !error && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Send a request to see the wire response
            </div>
          )}

          {resp && (
            <>
              <div className={cn(wireBox, "max-h-56 overflow-auto")}>
                <table className="w-full">
                  <tbody>
                    {resp.headers.map(([k, v]) => (
                      <tr key={k} className="border-b border-border/40 last:border-0">
                        <td className="w-1/3 whitespace-nowrap px-3 py-1.5 text-primary">{k}</td>
                        <td className="break-all px-3 py-1.5 text-foreground/80">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <pre className={cn(wireBox, "max-h-64 overflow-auto whitespace-pre-wrap p-3")}>
                {resp.body || (resp.status === 304 ? "(304 — empty body, use your cached copy)" : "(empty body)")}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* User payload editor                                                  */
/* ------------------------------------------------------------------ */

function PayloadBox({
  value,
  onChange,
  label = "Your payload",
  hint,
  placeholder = "One line per chunk…",
  rows = 4,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const lines = value.split("\n").filter((l) => l.trim().length > 0).length;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {lines} line{lines === 1 ? "" : "s"} · {value.length} chars
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full resize-y rounded-lg border border-border bg-input p-3 font-mono text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-primary/50 disabled:opacity-60"
      />
      {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Chunked transfer-encoding                                         */
/* ------------------------------------------------------------------ */

type Chunk = { i: number; bytes: number; text: string; at: number };


const DEFAULT_CHUNK_PAYLOAD = `Hello from my own payload
Each line here is sent as a separate chunk
Edit this text and press Start
The last line closes the response`;

function ChunkedSection() {
  const [state, setState] = useState<RunState>("idle");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [headers, setHeaders] = useState<[string, string][]>([]);
  const [delay, setDelay] = useState(400);
  const [count, setCount] = useState(8);
  const [payload, setPayload] = useState(DEFAULT_CHUNK_PAYLOAD);
  const abortRef = useRef<AbortController | null>(null);

  const usePayload = payload.trim().length > 0;
  const totalBytes = chunks.reduce((s, c) => s + c.bytes, 0);

  const start = async () => {
    reset(false);
    setState("connecting");
    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = performance.now();
    try {
      const res = await fetch(withKey(`${ENDPOINTS.chunked}?chunks=${count}&delay=${delay}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: usePayload ? payload : "" }),
        signal: ac.signal,
      });

      const hs: [string, string][] = [];
      res.headers.forEach((v, k) => hs.push([k, v]));
      setHeaders(hs.sort((a, b) => a[0].localeCompare(b[0])));
      setState("active");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let i = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        i += 1;
        const text = dec.decode(value, { stream: true });
        setChunks((c) => [...c, { i, bytes: value.byteLength, text, at: Math.round(performance.now() - t0) }]);
      }
      setState("done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState("error");
      else setState("idle");
    }
  };

  const reset = (full = true) => {
    abortRef.current?.abort();
    setChunks([]);
    if (full) {
      setHeaders([]);
      setState("idle");
    }
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Chunked Transfer-Encoding"
        subtitle="Watch each chunk land the moment it arrives instead of waiting for the whole body."
        state={state}
      >
        <Btn onClick={() => reset()} variant="ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Btn>
      </SectionHeader>

      <Explainer
        more={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              Chunked framing is an HTTP/1.1 feature: each chunk is prefixed with its hex length, and a zero-length chunk ends
              the message. HTTP/2 and HTTP/3 replace it with DATA frames, but the browser API you use is identical.
            </li>
            <li>
              Because the total size is unknown when headers are written, the server omits{" "}
              <span className="font-mono text-foreground">Content-Length</span> — so progress bars can't show a percentage.
            </li>
            <li>Great for logs, exports, and long-running generation. Bad for anything a CDN wants to cache by length.</li>
          </ul>
        }
      >
        Normally a server buffers the whole response, sets{" "}
        <span className="font-mono text-foreground">Content-Length</span>, and sends it in one go — you see nothing until it
        finishes. With chunked encoding it can start sending immediately and keep appending.
      </Explainer>

      <PayloadBox
        value={payload}
        onChange={setPayload}
        label="Your payload — one line per chunk"
        disabled={state === "active" || state === "connecting"}
        hint="This text is POSTed to the edge function, which streams it back one line at a time. Clear the box to fall back to the sample text."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
        <Btn variant="primary" onClick={start} disabled={state === "active" || state === "connecting"}>
          <Play className="h-3.5 w-3.5" /> Start
        </Btn>
        <Btn onClick={() => reset()} disabled={state !== "active"}>
          <Square className="h-3.5 w-3.5" /> Stop
        </Btn>
        {!usePayload && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sample chunks
            <input
              type="number"
              min={1}
              max={40}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-16 rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Delay (ms)
          <input
            type="number"
            min={0}
            max={2000}
            step={100}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-20 rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
          />
        </label>
        <div className="ml-auto grid grid-cols-3 gap-2">
          <Stat label="Chunks" value={chunks.length} />
          <Stat label="Bytes" value={totalBytes} />
          <Stat label="Elapsed" value={`${chunks.at(-1)?.at ?? 0}ms`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chunk waterfall</div>
          {chunks.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Press Start — blocks appear one at a time
            </div>
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-auto pr-1">
              {chunks.map((c) => {
                const max = chunks.at(-1)!.at || 1;
                return (
                  <div key={c.i} className="rounded-lg border border-border/60 bg-input p-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-primary">#{c.i}</span>
                      <span className="text-muted-foreground">
                        {c.bytes} B · +{c.at}ms
                      </span>
                    </div>
                    <div className="my-1 h-1 rounded-full bg-secondary">
                      <div
                        className="h-1 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(4, (c.at / max) * 100)}%` }}
                      />
                    </div>
                    <div className="break-all font-mono text-[11px] text-foreground/75">{c.text.trim()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Response headers</div>
          {headers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No response yet.</div>
          ) : (
            <div className={cn(wireBox, "max-h-[420px] overflow-auto")}>
              <table className="w-full">
                <tbody>
                  {headers.map(([k, v]) => (
                    <tr key={k} className="border-b border-border/40 last:border-0">
                      <td className="whitespace-nowrap px-2 py-1.5 text-primary">{k}</td>
                      <td className="break-all px-2 py-1.5 text-foreground/80">{v}</td>
                    </tr>
                  ))}
                  {!headers.some(([k]) => k === "content-length") && (
                    <tr>
                      <td className="px-2 py-1.5 text-accent">content-length</td>
                      <td className="px-2 py-1.5 text-muted-foreground">absent — length unknown up front</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Streaming vs buffered                                             */
/* ------------------------------------------------------------------ */

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const pts = data.slice(-60);
  return (
    <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="h-8 w-full">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        points={pts
          .map((v, i) => `${(i / Math.max(1, pts.length - 1)) * 120},${32 - (v / max) * 30}`)
          .join(" ")}
      />
    </svg>
  );
}

const DEFAULT_STREAM_PAYLOAD = `Write anything you want streamed back.
Every non-empty line arrives as its own piece.
The left panel paints each line the moment it lands.
The right panel waits for the entire body first.
Try pasting a long log or a story here.`;

function StreamingSection() {
  const [state, setState] = useState<RunState>("idle");
  const [streamText, setStreamText] = useState("");
  const [bufferedText, setBufferedText] = useState("");
  const [bufferedLoading, setBufferedLoading] = useState(false);
  const [firstStream, setFirstStream] = useState<number | null>(null);
  const [firstBuffered, setFirstBuffered] = useState<number | null>(null);
  const [rate, setRate] = useState<number[]>([]);
  const [compare, setCompare] = useState(true);
  const [payload, setPayload] = useState(DEFAULT_STREAM_PAYLOAD);
  const abortRef = useRef<AbortController | null>(null);
  const bytesWindow = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setRate((r) => [...r.slice(-59), bytesWindow.current * 2]);
      bytesWindow.current = 0;
    }, 500);
    return () => clearInterval(id);
  }, []);

  const start = async () => {
    reset();
    setState("connecting");
    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = performance.now();
    const post = (): RequestInit => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: payload }),
      signal: ac.signal,
    });

    const streamed = (async () => {
      const res = await fetch(withKey(`${ENDPOINTS.chunked}?chunks=12&delay=250`), post());
      setState("active");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesWindow.current += value.byteLength;
        setFirstStream((f) => f ?? Math.round(performance.now() - t0));
        const text = dec.decode(value, { stream: true });
        setStreamText((s) => s + text);
      }
    })();

    const buffered = (async () => {
      if (!compare) return;
      setBufferedLoading(true);
      const res = await fetch(withKey(`${ENDPOINTS.chunked}?chunks=12&delay=250&buffered=1`), post());
      const text = await res.text();
      setFirstBuffered(Math.round(performance.now() - t0));
      setBufferedText(text);
      setBufferedLoading(false);
    })();


    try {
      await Promise.all([streamed, buffered]);
      setState("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") setState("idle");
      else setState("error");
      setBufferedLoading(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setStreamText("");
    setBufferedText("");
    setBufferedLoading(false);
    setFirstStream(null);
    setFirstBuffered(null);
    setRate([]);
    setState("idle");
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Streaming Responses"
        subtitle="Read response.body with a ReadableStream reader and paint text as it arrives."
        state={state}
      >
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
          />
          Compare with buffered
        </label>
        <Btn onClick={reset} variant="ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Btn>
      </SectionHeader>

      <Explainer
        more={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <span className="font-mono text-foreground">const reader = response.body.getReader()</span> gives you{" "}
              <span className="font-mono text-foreground">Uint8Array</span> pieces; a{" "}
              <span className="font-mono text-foreground">TextDecoder</span> with{" "}
              <span className="font-mono text-foreground">{"{ stream: true }"}</span> stitches multi-byte characters that
              straddle a chunk boundary.
            </li>
            <li>
              Total time is the same for both panels — what changes is <em>perceived</em> latency: time to first content.
              That's why chat UIs stream.
            </li>
            <li>Aborting mid-stream with an AbortController stops the download instead of finishing it silently.</li>
          </ul>
        }
      >
        Both panels request the same amount of data. The left one renders every chunk immediately; the right one waits for the
        complete body before showing anything.
      </Explainer>

      <PayloadBox
        value={payload}
        onChange={setPayload}
        label="Your payload — both panels send this same text"
        rows={5}
        disabled={state === "active" || state === "connecting"}
        hint="Identical data, identical total time — only the time to first visible content differs."
      />


      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
        <Btn variant="primary" onClick={start} disabled={state === "active" || state === "connecting"}>
          <Waves className="h-3.5 w-3.5" /> Start stream
        </Btn>
        <Btn onClick={reset} disabled={state !== "active" && state !== "connecting"}>
          <Square className="h-3.5 w-3.5" /> Stop
        </Btn>
        <div className="min-w-[140px] flex-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Bytes / sec</div>
          <Sparkline data={rate} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Streamed 1st byte" value={firstStream != null ? `${firstStream}ms` : "—"} />
          <Stat label="Buffered 1st paint" value={firstBuffered != null ? `${firstBuffered}ms` : "—"} />
        </div>
      </div>

      <div className={cn("grid gap-4", compare ? "lg:grid-cols-2" : "")}>
        <div className="rounded-xl border border-primary/30 bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Streamed</span>
            <span className="font-mono text-[11px] text-muted-foreground">{streamText.length} chars</span>
          </div>
          <pre className={cn(wireBox, "h-64 overflow-auto whitespace-pre-wrap p-3")}>
            {streamText}
            {state === "active" && <span className="animate-pulse text-primary">▍</span>}
          </pre>
        </div>
        {compare && (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Buffered</span>
              <span className="font-mono text-[11px] text-muted-foreground">{bufferedText.length} chars</span>
            </div>
            <div className={cn(wireBox, "h-64 overflow-auto p-3")}>
              {bufferedLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  waiting for the full body…
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{bufferedText}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Server-Sent Events                                                */
/* ------------------------------------------------------------------ */

type SSEEvent = { id: string; name: string; data: string; at: string };

const READY_LABEL = ["CONNECTING", "OPEN", "CLOSED"];

const DEFAULT_SSE_PAYLOAD = `deploy started
building bundle
running tests
uploading assets
deploy finished`;

function SSESection() {
  const [state, setState] = useState<RunState>("idle");
  const [readyState, setReadyState] = useState<number | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [reconnects, setReconnects] = useState(0);
  const [payload, setPayload] = useState(DEFAULT_SSE_PAYLOAD);
  const [eventName, setEventName] = useState("message");
  const [interval_, setInterval_] = useState(1000);
  const esRef = useRef<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const openedOnce = useRef(false);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const push = (name: string, data: string, id = "") =>
    setEvents((e) => [...e.slice(-200), { id, name, data, at: new Date().toLocaleTimeString([], { hour12: false }) + "." + String(Date.now() % 1000).padStart(3, "0") }]);

  const connect = (limit?: number) => {
    disconnect(false);
    setState("connecting");
    openedOnce.current = false;
    const lines = payload.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    const used = limit ? lines.slice(0, limit) : lines;
    const name = eventName.trim() || "message";
    const params = new URLSearchParams({ interval: String(interval_), retry: "3000", event: name });
    if (used.length) params.set("text", used.join("\n"));
    else params.set("max", String(limit ?? 20));
    const es = new EventSource(withKey(`${ENDPOINTS.sse}?${params.toString()}`));
    esRef.current = es;
    setReadyState(es.readyState);



    es.onopen = () => {
      if (openedOnce.current) setReconnects((r) => r + 1);
      openedOnce.current = true;
      setState("active");
      setReadyState(es.readyState);
      push("open", "connection established (readyState 1)");
    };
    es.onerror = () => {
      setReadyState(es.readyState);
      if (es.readyState === EventSource.CLOSED) {
        setState("done");
        push("error", "connection closed by server (EventSource will not retry after close())");
      } else {
        setState("connecting");
        push("reconnecting", "connection dropped — EventSource is retrying automatically");
      }
    };
    ["tick", "metric", "message", "done"].forEach((name) => {
      es.addEventListener(name, (ev) => {
        const me = ev as MessageEvent;
        push(name, me.data, me.lastEventId);
        setReadyState(es.readyState);
        if (name === "done") setState("done");
      });
    });
  };

  const disconnect = (log = true) => {
    esRef.current?.close();
    esRef.current = null;
    if (log) {
      setState("idle");
      setReadyState(EventSource.CLOSED);
      push("client", "EventSource.close() — connection closed by the client");
    }
  };

  const reset = () => {
    disconnect(false);
    setEvents([]);
    setReconnects(0);
    openedOnce.current = false;
    setReadyState(null);
    setState("idle");
  };

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Server-Sent Events"
        subtitle="One long-lived HTTP response where the server pushes text events until someone hangs up."
        state={state}
      >
        <Btn onClick={reset} variant="ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Btn>
      </SectionHeader>

      <Explainer
        more={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              Wire format is plain text: <span className="font-mono text-foreground">event:</span>,{" "}
              <span className="font-mono text-foreground">data:</span>, <span className="font-mono text-foreground">id:</span>{" "}
              lines, separated by a blank line.
            </li>
            <li>
              <span className="font-mono text-foreground">retry: 3000</span> tells the browser how long to wait before
              reconnecting. On reconnect it sends the last{" "}
              <span className="font-mono text-foreground">id:</span> back as the{" "}
              <span className="font-mono text-foreground">Last-Event-ID</span> header so the server can resume.
            </li>
            <li>
              SSE vs WebSockets: SSE is one-way (server → client), text-only, plain HTTP (works with proxies, HTTP/2
              multiplexing, and auth headers via fetch-based polyfills), and auto-reconnects. WebSockets are bidirectional and
              binary-capable but you implement reconnection yourself.
            </li>
          </ul>
        }
      >
        Click Connect and events stream in on a single open response. Use "Simulate drop" to end the stream early and watch the
        browser's built-in reconnection kick in.
      </Explainer>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
        <Btn variant="primary" onClick={() => connect(20)} disabled={state === "active" || state === "connecting"}>
          <Plug className="h-3.5 w-3.5" /> Connect
        </Btn>
        <Btn onClick={() => disconnect()} disabled={!esRef.current}>
          <PlugZap className="h-3.5 w-3.5" /> Disconnect
        </Btn>
        <Btn onClick={() => connect(3)} title="Server closes after 3 events so you can see reconnect behaviour">
          <Radio className="h-3.5 w-3.5" /> Simulate short stream
        </Btn>
        <div className="ml-auto grid grid-cols-3 gap-2">
          <Stat label="readyState" value={readyState == null ? "—" : `${readyState} ${READY_LABEL[readyState]}`} />
          <Stat label="Events" value={events.length} />
          <Stat label="Reopens" value={reconnects} />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Event log</div>
        <div ref={logRef} className={cn(wireBox, "h-80 overflow-auto p-3")}>
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">Not connected.</div>
          ) : (
            events.map((e, i) => (
              <div key={i} className="flex gap-3 border-b border-border/30 py-1 last:border-0">
                <span className="shrink-0 text-muted-foreground">{e.at}</span>
                <span className="w-24 shrink-0 text-accent">{e.name}</span>
                {e.id && <span className="shrink-0 text-muted-foreground">id={e.id}</span>}
                <span className="break-all text-foreground/80">{e.data}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Polling                                                           */
/* ------------------------------------------------------------------ */

type PollEntry = { n: number; status: string; startedAt: number; ms: number | null };

function PollingSection() {
  const [shortState, setShortState] = useState<RunState>("idle");
  const [longState, setLongState] = useState<RunState>("idle");
  const [interval_, setInterval_] = useState(2000);
  const [shortLog, setShortLog] = useState<PollEntry[]>([]);
  const [longLog, setLongLog] = useState<PollEntry[]>([]);
  const [now, setNow] = useState(Date.now());

  const shortTimer = useRef<number | null>(null);
  const shortAttempt = useRef(0);
  const longRunning = useRef(false);
  const longAttempt = useRef(0);
  const longAbort = useRef<AbortController | null>(null);
  const t0Short = useRef(0);
  const t0Long = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  /* ---- short polling ---- */
  const shortTick = useCallback(async () => {
    shortAttempt.current += 1;
    const n = shortAttempt.current;
    const startedAt = performance.now();
    setShortLog((l) => [...l, { n, status: "…", startedAt, ms: null }]);
    try {
      const res = await fetch(
        withKey(`${ENDPOINTS.job}?mode=short&attempt=${n}&threshold=6`),
      );
      const data = await res.json();
      setShortLog((l) =>
        l.map((e) => (e.n === n ? { ...e, status: data.status, ms: Math.round(performance.now() - startedAt) } : e)),
      );
      if (data.status === "done") stopShort("done");
    } catch {
      setShortLog((l) => l.map((e) => (e.n === n ? { ...e, status: "error", ms: 0 } : e)));
      stopShort("error");
    }
  }, []);

  const startShort = () => {
    stopShort("idle");
    setShortLog([]);
    shortAttempt.current = 0;
    t0Short.current = Date.now();
    setShortState("active");
    shortTick();
    shortTimer.current = window.setInterval(shortTick, interval_);
  };

  const stopShort = (s: RunState) => {
    if (shortTimer.current) window.clearInterval(shortTimer.current);
    shortTimer.current = null;
    setShortState(s);
  };

  /* ---- long polling ---- */
  const longLoop = async () => {
    while (longRunning.current) {
      longAttempt.current += 1;
      const n = longAttempt.current;
      const startedAt = performance.now();
      setLongLog((l) => [...l, { n, status: "open", startedAt, ms: null }]);
      const ac = new AbortController();
      longAbort.current = ac;
      try {
        const res = await fetch(
          withKey(`${ENDPOINTS.job}?mode=long&attempt=${n}&threshold=3&timeout=15000`),
          { signal: ac.signal },
        );
        const data = await res.json();
        const ms = Math.round(performance.now() - startedAt);
        setLongLog((l) => l.map((e) => (e.n === n ? { ...e, status: data.status, ms } : e)));
        if (data.status === "done") {
          longRunning.current = false;
          setLongState("done");
          return;
        }
      } catch {
        setLongLog((l) =>
          l.map((e) => (e.n === n ? { ...e, status: "aborted", ms: Math.round(performance.now() - startedAt) } : e)),
        );
        longRunning.current = false;
        setLongState("idle");
        return;
      }
    }
  };

  const startLong = () => {
    longAbort.current?.abort();
    setLongLog([]);
    longAttempt.current = 0;
    t0Long.current = Date.now();
    longRunning.current = true;
    setLongState("active");
    longLoop();
  };

  const stopLong = () => {
    longRunning.current = false;
    longAbort.current?.abort();
    setLongState("idle");
  };

  useEffect(
    () => () => {
      if (shortTimer.current) window.clearInterval(shortTimer.current);
      longRunning.current = false;
      longAbort.current?.abort();
    },
    [],
  );

  const reset = () => {
    stopShort("idle");
    stopLong();
    setShortLog([]);
    setLongLog([]);
    shortAttempt.current = 0;
    longAttempt.current = 0;
  };

  const shortWaiting = shortLog.reduce((s, e) => s + (e.ms ?? 0), 0);
  const longWaiting = longLog.reduce((s, e) => s + (e.ms ?? 0), 0);
  const maxBar = Math.max(1000, ...longLog.map((e) => e.ms ?? 0));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Polling: Short vs Long"
        subtitle="Same mock job endpoint, two very different request patterns."
      >
        <Btn onClick={reset} variant="ghost">
          <RotateCcw className="h-3.5 w-3.5" /> Reset both
        </Btn>
      </SectionHeader>

      <Explainer
        more={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <span className="font-mono text-foreground">Short polling</span>: dead simple, works everywhere, but wastes
              requests when nothing changed and adds up to half the interval of latency.
            </li>
            <li>
              <span className="font-mono text-foreground">Long polling</span>: the server holds the request until there's news
              (or a timeout), so updates arrive near-instantly with far fewer requests — at the cost of a connection sitting
              open per client.
            </li>
            <li>
              <span className="font-mono text-foreground">SSE / streaming</span>: one connection, many messages, no re-request
              overhead. Reach for it when updates are frequent and one-directional. Use WebSockets when the client also needs
              to push.
            </li>
          </ul>
        }
      >
        Short polling asks "are we there yet?" on a fixed timer. Long polling asks once and the server simply doesn't answer
        until something happens — then the client immediately re-asks.
      </Explainer>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* short */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Timer className="h-4 w-4 text-accent" />
            <span className="font-medium">Short polling</span>
            <StateBadge state={shortState} />
            <div className="ml-auto flex items-center gap-2">
              <select
                value={interval_}
                onChange={(e) => setInterval_(Number(e.target.value))}
                disabled={shortState === "active"}
                className="rounded-md border border-border bg-input px-2 py-1 font-mono text-xs"
              >
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
              </select>
              {shortState === "active" ? (
                <Btn variant="danger" onClick={() => stopShort("idle")}>
                  <Square className="h-3.5 w-3.5" /> Stop
                </Btn>
              ) : (
                <Btn variant="primary" onClick={startShort}>
                  <Play className="h-3.5 w-3.5" /> Start
                </Btn>
              )}
            </div>
          </div>

          <div className={cn(wireBox, "h-64 overflow-auto p-3")}>
            {shortLog.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Idle.</div>
            ) : (
              shortLog.map((e) => (
                <div key={e.n} className="flex items-center gap-3 border-b border-border/30 py-1 last:border-0">
                  <span className="w-10 text-muted-foreground">#{e.n}</span>
                  <span
                    className={cn(
                      "w-20",
                      e.status === "done" ? "text-[hsl(var(--success))]" : e.status === "error" ? "text-destructive" : "text-accent",
                    )}
                  >
                    {e.status}
                  </span>
                  <span className="text-muted-foreground">{e.ms != null ? `${e.ms}ms` : "…"}</span>
                  <span className="ml-auto text-muted-foreground">
                    t+{((e.startedAt - (shortLog[0]?.startedAt ?? 0)) / 1000).toFixed(1)}s
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Requests sent" value={shortLog.length} />
            <Stat label="Time in flight" value={`${(shortWaiting / 1000).toFixed(1)}s`} />
          </div>
        </div>

        {/* long */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">Long polling</span>
            <StateBadge state={longState} />
            <div className="ml-auto">
              {longState === "active" ? (
                <Btn variant="danger" onClick={stopLong}>
                  <Square className="h-3.5 w-3.5" /> Stop
                </Btn>
              ) : (
                <Btn variant="primary" onClick={startLong}>
                  <Play className="h-3.5 w-3.5" /> Start
                </Btn>
              )}
            </div>
          </div>

          <div className={cn(wireBox, "h-64 space-y-2 overflow-auto p-3")}>
            {longLog.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Idle.</div>
            ) : (
              longLog.map((e) => {
                const live = e.ms == null;
                const elapsed = live ? now - (Date.now() - performance.now() + e.startedAt) : e.ms!;
                const shown = Math.max(0, Math.round(elapsed));
                return (
                  <div key={e.n}>
                    <div className="flex items-center gap-3">
                      <span className="w-10 text-muted-foreground">#{e.n}</span>
                      <span
                        className={cn(
                          "w-20",
                          e.status === "done"
                            ? "text-[hsl(var(--success))]"
                            : e.status === "open"
                              ? "text-primary"
                              : "text-accent",
                        )}
                      >
                        {e.status}
                      </span>
                      <span className="text-muted-foreground">{shown}ms held</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          live ? "bg-primary/70 animate-pulse" : "bg-primary",
                        )}
                        style={{ width: `${Math.min(100, (shown / maxBar) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Requests sent" value={longLog.length} />
            <Stat label="Time connected" value={`${(longWaiting / 1000).toFixed(1)}s`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                                */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "methods", label: "Methods & Headers", icon: Terminal, render: () => <MethodsSection /> },
  { id: "chunked", label: "Chunked Encoding", icon: Send, render: () => <ChunkedSection /> },
  { id: "streaming", label: "Streaming", icon: Waves, render: () => <StreamingSection /> },
  { id: "sse", label: "Server-Sent Events", icon: Radio, render: () => <SSESection /> },
  { id: "polling", label: "Polling", icon: Timer, render: () => <PollingSection /> },
] as const;

export function HTTPPlaygroundTool() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]["id"]>("methods");
  const current = useMemo(() => SECTIONS.find((s) => s.id === active)!, [active]);

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row">
      <aside className="shrink-0 md:w-56">
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const on = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full",
                  on
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 hidden rounded-lg border border-border/60 bg-card p-3 text-[11px] leading-relaxed text-muted-foreground md:block">
          Demo endpoints run as edge functions so chunking, streaming and SSE are real — not simulated in the browser.
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-auto pb-8">{current.render()}</section>
    </div>
  );
}

export default HTTPPlaygroundTool;
