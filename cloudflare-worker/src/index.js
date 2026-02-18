/**
 * R2 Upload Worker - Render/Heroku gibi platformlardan R2'ye güvenli proxy.
 * TLS handshake sorununu bypass eder (Worker Cloudflare edge'de çalışır).
 */
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authSecret = request.headers.get("X-Auth-Secret");
    if (!authSecret || authSecret !== env.R2_WORKER_SECRET) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const key = request.headers.get("X-R2-Key");
    const contentType = request.headers.get("X-Content-Type") || "application/octet-stream";
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing X-R2-Key header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });
      return new Response(JSON.stringify({ ok: true, key }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error("R2 put error:", err);
      return new Response(
        JSON.stringify({ error: "Upload failed", message: String(err.message) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
