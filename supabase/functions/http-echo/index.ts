import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const baseHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// Stable weak ETag so the If-None-Match demo can produce a real 304.
const DEMO_ETAG = '"http-playground-demo-v1"';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...baseHeaders, "X-Demo-Preflight": "handled" },
    });
  }

  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    // never reflect credentials back
    if (["authorization", "apikey", "cookie"].includes(k.toLowerCase())) {
      headers[k] = "<redacted>";
    } else {
      headers[k] = v;
    }
  });

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.replaceAll("W/", "").trim() === DEMO_ETAG) {
    return new Response(null, {
      status: 304,
      headers: { ...baseHeaders, ETag: DEMO_ETAG, "Cache-Control": "max-age=0, must-revalidate" },
    });
  }

  let body: string | null = null;
  if (!["GET", "HEAD"].includes(req.method)) {
    try {
      body = await req.text();
    } catch {
      body = null;
    }
  }

  const payload = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers,
    body: body && body.length ? body : null,
    bodyBytes: body ? new TextEncoder().encode(body).length : 0,
    receivedAt: new Date().toISOString(),
    note: "This response was produced by the HTTP Playground echo function.",
  };

  const json = JSON.stringify(payload, null, 2);

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json",
        "Content-Length": String(new TextEncoder().encode(json).length),
        ETag: DEMO_ETAG,
      },
    });
  }

  return new Response(json, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      ETag: DEMO_ETAG,
      "Cache-Control": "max-age=0, must-revalidate",
      "X-Demo-Server": "supabase-edge-runtime",
    },
  });
});
