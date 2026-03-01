/**
 * R2 Upload Worker - Render/Heroku gibi platformlardan R2'ye güvenli proxy.
 * TLS handshake sorununu bypass eder (Worker Cloudflare edge'de çalışır).
 * GET: r2.dev erişilemediğinde dosya okuma (proxy).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Auth-Secret, X-R2-Key, X-Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // GET: Dosya oku (Origin/Referer whitelist ile korunur)
    if (request.method === "GET" && url.pathname !== "/" && url.pathname !== "") {
      const allowedOrigins = (env.ALLOWED_ORIGINS || "https://swimcenter.onrender.com,https://swimcenter-api.onrender.com,http://localhost:3000,http://localhost:3001").split(",");
      const origin = request.headers.get("Origin") || "";
      const referer = request.headers.get("Referer") || "";
      const authSecret = request.headers.get("X-Auth-Secret");

      const isOriginAllowed = origin && allowedOrigins.some(o => origin.startsWith(o.trim()));
      const isRefererAllowed = referer && allowedOrigins.some(o => referer.startsWith(o.trim()));
      const isSecretValid = authSecret && authSecret === env.R2_WORKER_SECRET;

      if (!isOriginAllowed && !isRefererAllowed && !isSecretValid) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const key = url.pathname.replace(/^\//, "");
      if (!key) {
        return new Response("Bad Request", { status: 400 });
      }
      try {
        const object = await env.BUCKET.get(key);
        if (!object) {
          return new Response("Not Found", { status: 404 });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        const respOrigin = isOriginAllowed ? origin : (allowedOrigins[0] || "*").trim();
        headers.set("Access-Control-Allow-Origin", respOrigin);
        return new Response(object.body, { status: 200, headers });
      } catch (err) {
        console.error("R2 get error:", err);
        return new Response("Error", { status: 500 });
      }
    }

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

    const rawKey = request.headers.get("X-R2-Key");
    const contentType = request.headers.get("X-Content-Type") || "application/octet-stream";
    if (!rawKey) {
      return new Response(JSON.stringify({ error: "Missing X-R2-Key header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const key = rawKey.replace(/\/+/g, "/").trim();
    const allowedPrefixes = ["id_cards/", "profile_photos/", "health_reports/"];
    const hasValidPrefix = allowedPrefixes.some((p) => key.startsWith(p));
    const safeKey = /^[a-zA-Z0-9/_.-]+$/.test(key) && !key.includes("..");
    if (!hasValidPrefix || !safeKey || key.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid X-R2-Key" }), {
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
