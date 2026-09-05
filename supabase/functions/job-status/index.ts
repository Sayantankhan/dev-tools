import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const baseHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "long" ? "long" : "short";
  // Client tracks its own attempt count; the job "finishes" after `threshold` calls
  // for short polling, or after `readyAt` ms of held-open time for long polling.
  const attempt = Math.max(Number(url.searchParams.get("attempt") ?? 1), 1);
  const threshold = Math.min(Math.max(Number(url.searchParams.get("threshold") ?? 5), 1), 50);
  const timeout = Math.min(Math.max(Number(url.searchParams.get("timeout") ?? 15000), 1000), 25000);

  // User-submitted job payload: POST JSON body, raw text, or ?job=
  let job: unknown = null;
  if (req.method === "POST") {
    const raw = await req.text().catch(() => "");
    if (raw) {
      try {
        job = JSON.parse(raw);
      } catch {
        job = raw.slice(0, 5000);
      }
    }
  }
  if (job === null) {
    const q = url.searchParams.get("job");
    if (q) job = q.slice(0, 5000);
  }

  const started = Date.now();

  if (mode === "short") {
    const done = attempt >= threshold;
    return json({
      mode,
      attempt,
      job,
      status: done ? "done" : "pending",
      progress: Math.min(100, Math.round((attempt / threshold) * 100)),
      result: done ? describe(job) : null,
      heldMs: 0,
      at: new Date().toISOString(),
    });
  }

  // Long polling: hold the request open until "an update happens" or we time out.
  const workMs = 2000 + Math.random() * 6000;
  const done = attempt >= threshold;
  const waitMs = Math.min(workMs, timeout);
  await new Promise((r) => setTimeout(r, waitMs));

  const timedOut = waitMs >= timeout;
  return json({
    mode,
    attempt,
    job,
    status: timedOut ? "timeout" : done ? "done" : "pending",
    progress: Math.min(100, Math.round((attempt / threshold) * 100)),
    result: !timedOut && done ? describe(job) : null,
    heldMs: Date.now() - started,
    at: new Date().toISOString(),
  });
});

function describe(job: unknown) {
  if (job === null || job === undefined) return "job finished (no payload submitted)";
  const text = typeof job === "string" ? job : JSON.stringify(job);
  return `processed your payload (${text.length} chars): ${text.slice(0, 200)}`;
}

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...baseHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
