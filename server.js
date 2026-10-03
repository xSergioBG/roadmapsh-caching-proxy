const express = require("express");
const morgan = require("morgan");
const yargs = require("yargs");

function createProxy(origin, { fetchImpl = fetch, ttl = 60000, maxEntries = 1000, logger = true } = {}) {
  const upstream = new URL(origin);
  if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password ||
      upstream.search || upstream.hash) throw new Error("Origin must be an HTTP(S) URL without credentials, query or fragment.");
  const base = upstream.href.replace(/\/$/, "");
  const app = express();
  const cache = new Map();
  app.disable("x-powered-by");
  if (logger) app.use(morgan("dev"));
  app.use(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      return res.status(405).send("Only GET and HEAD are supported.");
    }
    // This teaching proxy serves public resources only.
    if (req.headers.authorization || req.headers.cookie) {
      return res.status(400).send("Authenticated requests are not supported.");
    }
    const key = req.originalUrl;
    const stored = cache.get(key);
    if (stored && stored.expiresAt > Date.now()) {
      res.set("X-Cache", "HIT");
      res.set("Content-Type", stored.contentType);
      return res.status(stored.status).send(stored.body);
    }
    cache.delete(key);
    try {
      const response = await fetchImpl(base + key, { signal: AbortSignal.timeout(10000), redirect: "manual" });
      const body = await response.text();
      const contentType = response.headers.get("content-type") || "text/plain; charset=utf-8";
      const cacheControl = response.headers.get("cache-control") || "";
      const vary = response.headers.get("vary") || "";
      // Do not cache errors, private responses, cookies or content varying by request headers.
      if (req.method === "GET" && response.status === 200 &&
          !/private|no-store|no-cache/i.test(cacheControl) && !response.headers.get("set-cookie") &&
          !vary && Buffer.byteLength(body) <= 1024 * 1024 && maxEntries > 0 && ttl > 0) {
        if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
        cache.set(key, { body, contentType, status: response.status, expiresAt: Date.now() + ttl });
      }
      res.set("X-Cache", "MISS");
      res.set("Content-Type", contentType);
      if (response.headers.get("location")) res.set("Location", response.headers.get("location"));
      res.set("Cache-Control", cacheControl || "no-store");
      return res.status(response.status).send(body);
    } catch (error) {
      return res.status(502).send("Error fetching data from origin");
    }
  });
  return { app, cache };
}

function start() {
  const argv = yargs(process.argv.slice(2))
    .option("port", { alias: "p", type: "number", description: "Proxy server port", default: 3000 })
    .option("origin", { alias: "o", type: "string", description: "Origin server URL" })
    .option("clear-cache", { type: "boolean", description: "Explain process-local cache lifecycle" })
    .strict().help().parse();
  if (argv["clear-cache"]) {
    console.log("Cache is process-local. Restart the running proxy to clear it.");
    return;
  }
  if (!argv.origin) throw new Error("Please provide --origin.");
  if (!Number.isInteger(argv.port) || argv.port < 1 || argv.port > 65535) throw new Error("Port must be between 1 and 65535.");
  const { app } = createProxy(argv.origin);
  const server = app.listen(argv.port, "127.0.0.1", () => {
    console.log(`Caching proxy running on http://127.0.0.1:${argv.port}, origin ${argv.origin}`);
  });
  server.on("error", error => { console.error(error.message); process.exitCode = 1; });
}
if (require.main === module) {
  try { start(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createProxy };
