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
  const max = Math.min(Math.max(Number(url.searchParams.get("max") ?? 20), 1), 200);
  const retry = Math.min(Math.max(Number(url.searchParams.get("retry") ?? 3000), 500), 30000);
  const lastEventId = Number(req.headers.get("last-event-id") ?? url.searchParams.get("lastEventId") ?? 0) || 0;

  const encoder = new TextEncoder();
  let timer: number | undefined;
  let id = lastEventId;

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      send(`retry: ${retry}\n\n`);
      send(`event: open\ndata: ${JSON.stringify({ message: "stream opened", resumedFrom: lastEventId })}\n\n`);

      let sent = 0;
      timer = setInterval(() => {
        id += 1;
        sent += 1;
        const name = EVENT_NAMES[(id - 1) % EVENT_NAMES.length];
        const payload = {
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
