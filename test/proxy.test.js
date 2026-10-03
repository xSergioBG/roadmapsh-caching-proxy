const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createProxy } = require("../server");
async function fixture(t, options = {}) {
  let calls = 0;
  const { app, cache } = createProxy("http://upstream.example", {
    logger: false,
    fetchImpl: async () => { calls++; return new Response('{"ok":true}', { headers: { "content-type": "application/json" } }); },
    ...options,
  });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = "http://127.0.0.1:" + server.address().port;
  return { cache, calls: () => calls, get: (path = "/", init) => fetch(url + path, init) };
}
test("MISS then HIT preserve body and content type", async t => {
  const f = await fixture(t);
  const first = await f.get("/items?q=1"); const second = await f.get("/items?q=1");
  assert.equal(first.headers.get("x-cache"), "MISS");
  assert.equal(second.headers.get("x-cache"), "HIT");
  assert.match(second.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await second.json(), { ok: true });
  assert.equal(f.calls(), 1);
});
test("query strings are separate cache keys", async t => {
  const f = await fixture(t); await f.get("/?q=1"); await f.get("/?q=2");
  assert.equal(f.calls(), 2);
});
test("upstream errors preserve status and are not cached", async t => {
  let calls = 0;
  const f = await fixture(t, { fetchImpl: async () => { calls++; return new Response("missing", { status: 404 }); } });
  assert.equal((await f.get()).status, 404);
  assert.equal((await f.get()).status, 404);
  assert.equal(calls, 2);
});
test("network failures return 502", async t => {
  const f = await fixture(t, { fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal((await f.get()).status, 502);
});
test("POST and authenticated requests never reach upstream", async t => {
  const f = await fixture(t);
  assert.equal((await f.get("/", { method: "POST" })).status, 405);
  assert.equal((await f.get("/", { headers: { Authorization: "Bearer demo" } })).status, 400);
  assert.equal((await f.get("/", { headers: { Cookie: "session=demo" } })).status, 400);
  assert.equal(f.calls(), 0);
});
test("no-store and Vary responses are not cached", async t => {
  for (const headers of [{ "cache-control": "no-store" }, { vary: "Accept-Language" }, { "set-cookie": "a=b" }]) {
    let calls = 0;
    const f = await fixture(t, { fetchImpl: async () => { calls++; return new Response("private", { headers }); } });
    await f.get(); await f.get(); assert.equal(calls, 2);
  }
});
test("expired entries and capacity limit trigger refetch", async t => {
  const f = await fixture(t, { maxEntries: 1 });
  await f.get("/a"); f.cache.get("/a").expiresAt = 0;
  await f.get("/a"); await f.get("/b");
  assert.equal(f.calls(), 3); assert.equal(f.cache.size, 1);
  await f.get("/a"); assert.equal(f.calls(), 4);
});
test("invalid origin URL is rejected", () => {
  for (const url of ["file:///tmp/a", "http://user:pass@localhost", "http://localhost/?a=b"]) {
    assert.throws(() => createProxy(url));
  }
});
