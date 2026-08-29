import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const baseHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

const WORDS = [
  "Transfer-Encoding: chunked lets a server start sending a response",
  "before it knows how long the whole body will be.",
  "Each chunk is prefixed with its size in hex, then the body bytes.",
  "A zero-length chunk terminates the message.",
  "Because the length is unknown up front, Content-Length is omitted.",
  "Browsers expose arriving bytes through response.body (a ReadableStream).",
  "That is exactly how streamed AI answers appear token by token.",
  "When the last chunk lands, the connection can be reused for the next request.",
];

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const url = new URL(req.url);
  const chunks = Math.min(Math.max(Number(url.searchParams.get("chunks") ?? 8), 1), 40);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 400), 0), 3000);
  const buffered = url.searchParams.get("buffered") === "1";

  const encoder = new TextEncoder();
  const lines: string[] = [];
  for (let i = 0; i < chunks; i++) {
    lines.push(`[chunk ${i + 1}/${chunks}] ${WORDS[i % WORDS.length]}\n`);
  }

  if (buffered) {
    // Simulates a classic buffered response: wait for everything, then send once.
    return new Promise<Response>((resolve) => {
      setTimeout(() => {
        const body = lines.join("");
        resolve(
          new Response(body, {
            status: 200,
            headers: {
              ...baseHeaders,
              "Content-Type": "text/plain; charset=utf-8",
              "Content-Length": String(encoder.encode(body).length),
              "X-Demo-Mode": "buffered",
            },
          }),
        );
      }, delay * chunks);
    });
  }

  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) break;
        if (i > 0 && delay > 0) await new Promise((r) => setTimeout(r, delay));
        controller.enqueue(encoder.encode(lines[i]));
      }
      if (!cancelled) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Demo-Mode": "chunked",
      "X-Demo-Chunks": String(chunks),
    },
  });
});
