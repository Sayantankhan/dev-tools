import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const baseHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

const EVENT_NAMES = ["tick", "metric", "message", "tick"];

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const url = new URL(req.url);
  const interval = Math.min(Math.max(Number(url.searchParams.get("interval") ?? 1000), 200), 10000);
  const retry = Math.min(Math.max(Number(url.searchParams.get("retry") ?? 3000), 500), 30000);
  const lastEventId = Number(req.headers.get("last-event-id") ?? url.searchParams.get("lastEventId") ?? 0) || 0;

  // EventSource can only GET, so the user payload arrives as ?text= (newline separated).
  const userLines = (url.searchParams.get("text") ?? "")
    .slice(0, 20000)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .slice(0, 200);
  const eventName = (url.searchParams.get("event") ?? "").trim();

  const max = userLines.length
    ? userLines.length
    : Math.min(Math.max(Number(url.searchParams.get("max") ?? 20), 1), 200);

  const encoder = new TextEncoder();
  let timer: number | undefined;
  let id = lastEventId;

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      send(`retry: ${retry}\n\n`);
      send(`event: open\ndata: ${JSON.stringify({ message: "stream opened", resumedFrom: lastEventId, source: userLines.length ? "user-payload" : "sample" })}\n\n`);

      let sent = 0;
      timer = setInterval(() => {
        id += 1;
        sent += 1;
        const line = userLines.length ? userLines[(sent - 1) % userLines.length] : undefined;
        const name = line
          ? eventName || "message"
          : EVENT_NAMES[(id - 1) % EVENT_NAMES.length];
        const payload = line
          ? { id, name, text: line, at: new Date().toISOString() }
          : {
              id,
              name,
              value: Math.round(Math.random() * 1000) / 10,
              at: new Date().toISOString(),
            };
        send(`id: ${id}\nevent: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
        if (sent >= max) {
          clearInterval(timer);
          send(`event: done\ndata: ${JSON.stringify({ message: "server closed the stream" })}\n\n`);
          controller.close();
        }
      }, interval) as unknown as number;
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
