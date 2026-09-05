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

const MAX_LINES = 200;
const MAX_CHARS = 20000;

function normalise(raw: string): string[] {
  return raw
    .slice(0, MAX_CHARS)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .slice(0, MAX_LINES);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const url = new URL(req.url);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 400), 0), 3000);
  const buffered = url.searchParams.get("buffered") === "1";

  // User-supplied payload: POST JSON { text } / { lines: [] }, raw text body, or ?text=
  let userLines: string[] = [];
  if (req.method === "POST") {
    const raw = await req.text().catch(() => "");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.lines)) userLines = normalise(parsed.lines.join("\n"));
        else if (typeof parsed?.text === "string") userLines = normalise(parsed.text);
        else userLines = normalise(raw);
      } catch {
        userLines = normalise(raw);
      }
    }
  }
  if (!userLines.length) {
    const q = url.searchParams.get("text");
    if (q) userLines = normalise(q);
  }

  const encoder = new TextEncoder();
  let lines: string[];

  if (userLines.length) {
    lines = userLines.map((l) => `${l}\n`);
  } else {
    const chunks = Math.min(Math.max(Number(url.searchParams.get("chunks") ?? 8), 1), 40);
    lines = [];
    for (let i = 0; i < chunks; i++) {
      lines.push(`[chunk ${i + 1}/${chunks}] ${WORDS[i % WORDS.length]}\n`);
    }
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
      }, delay * lines.length);
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
      "X-Demo-Chunks": String(lines.length),
      "X-Demo-Source": userLines.length ? "user-payload" : "sample",
    },
  });
});
