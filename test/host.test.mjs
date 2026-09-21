// Host-half tests for dsh-cost-balance-indicator (the merged plugin).
//
// Covers the merged config schema, the pure pricing helpers, the `peakCost`
// projection fold (peak vs off-peak vs weekend vs same-step replacement), the
// balance reader (cache, force, stale fallback, error paths, key precedence),
// and one real call to the official DeepSeek balance endpoint when a key is
// discoverable.
//
// The live case reads the key from the environment or the managed credential
// store directly. That is test-harness convenience only: the plugin resolves the
// key through the credentials service and never exposes it.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import plugin, {
  BALANCE_PATH,
  Config,
  SettingsConfig,
  createBalanceReader,
  createPeakCostProjection,
  currentPeriod,
  normalizeBalanceConfig,
  parseBalancePayload,
  periodAt,
  plugin as namedPlugin,
  priceFor,
  resolveApiKey
} from "../lib/index.js";

/** Build a fake host context capturing routes, services and projections. */
function makeCtx({ apiKey, connection = true, compaction = false, settings = true } = {}) {
  const routes = [];
  const services = {};
  const projections = [];
  const loaderUpdates = [];
  const listeners = [];
  const ctx = {
    connection: connection ? { fetch: { register: (route) => { routes.push(route); return () => {}; } } } : void 0,
    get(name) {
      if (name === "credentials" && typeof apiKey === "string") {
        return { resolve: async () => ({ value: apiKey, source: "managed" }) };
      }
      return void 0;
    },
    sessionProjections: { register: (projection) => { projections.push(projection); } },
    tokenMeter: { measure: () => ({ totalTokens: 0 }) },
    loader: {
      resolve: (id) => (compaction && id === "compaction-basic" ? { id } : void 0),
      update: (id, patch) => { loaderUpdates.push({ id, patch }); }
    },
    settings: settings ? { register: () => ({ watch: () => {} }) } : void 0,
    on: (event, listener) => { listeners.push({ event, listener }); },
    effect: (callback) => { const dispose = callback(); return () => { if (typeof dispose === "function") dispose(); }; },
    provide: (key, value) => { services[key] = value; },
    // Stand-in for ctx.inject: run the body only when every required service is
    // actually present, exactly as a waiting sub-fiber would.
    inject: (deps, callback) => { if (deps.every((dep) => ctx[dep] !== void 0)) callback(ctx); },
    logger: { info() {}, warn() {}, error() {} }
  };
  return { ctx, routes, services, projections, loaderUpdates, listeners };
}

/** Start a mock balance endpoint; returns its base URL and a hit counter. */
async function startMock(handler) {
  const hits = { count: 0 };
  const server = createServer((request, response) => {
    hits.count += 1;
    handler(request, response, hits.count);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, hits, stop: () => new Promise((resolve) => server.close(resolve)) };
}

const CNY_BODY = JSON.stringify({
  is_available: true,
  balance_infos: [{ currency: "CNY", total_balance: "32.65", granted_balance: "0.00", topped_up_balance: "32.65" }]
});

/** Discover a real key for the optional live case. */
function discoverKey() {
  if (typeof process.env.DEEPSEEK_BALANCE_TEST_KEY === "string" && process.env.DEEPSEEK_BALANCE_TEST_KEY.length > 0) {
    return process.env.DEEPSEEK_BALANCE_TEST_KEY;
  }
  const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
  try {
    const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
    const match = /DEEPSEEK_API_KEY:\s*(\S+)/.exec(text);
    return match === null ? void 0 : match[1];
  } catch {
    return void 0;
  }
}

// ---------------------------------------------------------------- pricing ---

test("the merged Config schema resolves both halves' defaults", () => {
  const resolved = Config({});
  // pricing half (dsh-peak-indicator)
  assert.deepEqual(resolved.peakWindows, [[9, 12], [14, 18]]);
  assert.equal(resolved.offPeakDiscount, 0.5);
  assert.equal(resolved.policyEffectiveDate, "2026-08-17T00:00:00+08:00");
  assert.equal(resolved.weekendOffPeakEffectiveDate, "2026-08-23T00:00:00+08:00");
  assert.equal(resolved.autoCompact.enabled, true);
  assert.equal(resolved.autoCompact.contextBudget, 100000);
  assert.equal(resolved.autoCompact.retainTokens, 15000);
  // balance half (dsh-balance-indicator)
  assert.equal(resolved.apiKeyEnv, "DEEPSEEK_API_KEY");
  assert.equal(resolved.baseUrl, "https://api.deepseek.com");
  assert.equal(resolved.cacheMs, 20000);
  assert.equal(resolved.timeoutMs, 10000);
  assert.equal(resolved.lowBalanceThreshold, 5);
  // overrides still land
  const custom = Config({ autoCompact: { contextBudget: 60000 }, lowBalanceThreshold: 12.5, prices: { "deepseek-v4-flash": { input: 1, output: 2, cacheHitInput: 0.01 } } });
  assert.equal(custom.autoCompact.contextBudget, 60000);
  assert.equal(custom.autoCompact.retainTokens, 15000);
  assert.equal(custom.lowBalanceThreshold, 12.5);
  assert.equal(custom.prices["deepseek-v4-flash"].input, 1);
});

test("period and price resolution follow the official policy", () => {
  const config = Config({});
  // Friday 2026-09-18 10:00 Beijing = 02:00Z -> peak; 20:00 Beijing = 12:00Z -> off-peak.
  assert.equal(periodAt(Date.UTC(2026, 8, 18, 2, 0, 0), config), "peak");
  assert.equal(periodAt(Date.UTC(2026, 8, 18, 12, 0, 0), config), "offpeak");
  // Saturday 2026-09-19 10:00 Beijing: weekend rule makes it off-peak all day.
  assert.equal(periodAt(Date.UTC(2026, 8, 19, 2, 0, 0), config), "offpeak");
  assert.deepEqual(priceFor("deepseek-v4-flash", "peak", Date.UTC(2026, 8, 18, 2, 0, 0), config), { input: 2, output: 8, cacheHitInput: 0.04 });
  assert.deepEqual(priceFor("deepseek-v4-flash", "offpeak", Date.UTC(2026, 8, 18, 2, 0, 0), config), { input: 1, output: 4, cacheHitInput: 0.02 });
  // Before the policy date the legacy flat table applies.
  assert.deepEqual(priceFor("deepseek-v4-flash", "peak", Date.UTC(2026, 7, 1), config), { input: 1, output: 2, cacheHitInput: 0.02 });
  assert.equal(priceFor("some-unknown-model", "peak", Date.UTC(2026, 8, 18, 2, 0, 0), config), null);
  assert.equal(currentPeriod(new Date(Date.UTC(2026, 8, 18, 2, 0, 0)), config).period, "peak");
});

test("the peakCost projection folds usage at the period of each event", () => {
  const config = Config({});
  const projection = createPeakCostProjection(config);
  const peak = Date.UTC(2026, 8, 18, 2, 0, 0);
  const offpeak = Date.UTC(2026, 8, 18, 12, 0, 0);
  const usage = (inputTokens, outputTokens = 0) => ({ inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 });

  let state = projection.init();
  state = projection.apply(state, { type: "request/header", time: peak, data: { header: { config: { provider: "deepseek-official", model: "deepseek-v4-flash" } } } });
  // One million uncached input tokens at the peak input rate of 2 CNY/1M.
  state = projection.apply(state, { type: "assistant/chunk", time: peak, data: { turn: 1, step: 1, chunk: { type: "usage", usage: usage(1000000) } } });
  assert.equal(projection.view(state).totalCost, 2);
  // The same turn/step reports again (assistant/message after the chunk): the
  // fold replaces that step's buckets instead of double counting.
  state = projection.apply(state, { type: "assistant/message", time: peak, data: { turn: 1, step: 1, usage: usage(1000000), message: { id: "m1" } } });
  let view = projection.view(state);
  assert.equal(view.totalCost, 2);
  assert.equal(view.messageCosts.m1.cost, 2);
  assert.equal(view.messageCosts.m1.period, "peak");
  assert.equal(view.byModel["deepseek-official/deepseek-v4-flash"].uncachedInputTokens, 1000000);
  // A second step in the same turn, off-peak: 1 CNY/1M input + 4 CNY/1M output.
  state = projection.apply(state, { type: "assistant/chunk", time: offpeak, data: { turn: 1, step: 2, chunk: { type: "usage", usage: usage(1000000, 1000000) } } });
  view = projection.view(state);
  assert.equal(view.totalCost, 2 + 1 + 4);
  assert.equal(view.currency, "CNY");
  // A turn that produces nothing that the price table knows stays untouched.
  const before = state;
  assert.equal(projection.apply(state, { type: "assistant/chunk", time: peak, data: { turn: 2, step: 1, chunk: { type: "text", text: "hi" } } }), before);
});

// ------------------------------------------------------- merged plugin row ---

test("one apply mounts the projection, the settings section and the balance route", async () => {
  const { ctx, routes, services, projections } = makeCtx({ apiKey: "sk-test" });
  await plugin.apply(ctx, Config({}));
  assert.equal(projections.length, 1);
  assert.equal(projections[0].key, "peakCost");
  assert.equal(projections[0].stateVersion, 5);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, BALANCE_PATH);
  assert.deepEqual(routes[0].methods, ["GET"]);
  assert.equal(typeof services.deepseekBalance.read, "function");
});

test("without a Web route registry the pricing half still mounts", async () => {
  const { ctx, routes, services, projections } = makeCtx({ apiKey: "sk-test", connection: false });
  await plugin.apply(ctx, Config({}));
  assert.equal(projections.length, 1, "the session projection is independent of the Web carrier");
  assert.equal(routes.length, 0);
  assert.equal(services.deepseekBalance, void 0);
});

test("auto-compaction is delegated to the loader when compaction-basic exists", async () => {
  const { ctx, loaderUpdates, services, listeners } = makeCtx({ compaction: true });
  await plugin.apply(ctx, Config({ autoCompact: { contextBudget: 128000, referenceWindow: 256000, retainTokens: 20000 } }));
  assert.equal(loaderUpdates.length, 1);
  assert.equal(loaderUpdates[0].id, "compaction-basic");
  assert.equal(loaderUpdates[0].patch.config.thresholdRatio, 0.5);
  assert.equal(loaderUpdates[0].patch.config.retainTokens, 20000);
  assert.equal(typeof services.peakCompactStats.get, "function");
  assert.equal(listeners.filter((entry) => entry.event === "agent/pre-step").length, 1);
});

test("auto-compaction can be switched off", async () => {
  const { ctx, loaderUpdates, services, listeners } = makeCtx({ compaction: true });
  await plugin.apply(ctx, Config({ autoCompact: { enabled: false } }));
  assert.equal(loaderUpdates.length, 0);
  assert.equal(services.peakCompactStats, void 0);
  assert.equal(listeners.length, 0);
});

// --------------------------------------------------------- balance reader ---

test("normalizeBalanceConfig keeps defaults and accepts overrides", () => {
  const defaults = normalizeBalanceConfig(void 0);
  assert.equal(defaults.baseUrl, "https://api.deepseek.com");
  assert.equal(defaults.apiKeyEnv, "DEEPSEEK_API_KEY");
  assert.equal(defaults.apiKey, void 0);
  assert.equal(defaults.timeoutMs, 10000);
  assert.equal(defaults.cacheMs, 20000);
  assert.equal(defaults.lowBalanceThreshold, 5);
  const custom = normalizeBalanceConfig({ baseUrl: "http://127.0.0.1:1/", apiKeyEnv: "OTHER_KEY", apiKey: "sk-x", timeoutMs: -1, lowBalanceThreshold: 12.5 });
  assert.equal(custom.baseUrl, "http://127.0.0.1:1");
  assert.equal(custom.apiKeyEnv, "OTHER_KEY");
  assert.equal(custom.apiKey, "sk-x");
  assert.equal(custom.timeoutMs, 10000, "a negative timeout falls back to the default");
  assert.equal(normalizeBalanceConfig({ apiKeyEnv: "not a shell name" }).apiKeyEnv, "DEEPSEEK_API_KEY");
});

test("parseBalancePayload prefers the CNY wallet and tolerates junk", () => {
  const parsed = parseBalancePayload({
    is_available: true,
    balance_infos: [
      { currency: "USD", total_balance: "1.00", granted_balance: "0", topped_up_balance: "1.00" },
      { currency: "CNY", total_balance: "32.65", granted_balance: "0.00", topped_up_balance: "32.65" }
    ]
  });
  assert.equal(parsed.primary.currency, "CNY");
  assert.equal(parsed.primary.totalBalance, 32.65);
  assert.equal(parsed.wallets.length, 2);
  assert.equal(parseBalancePayload({ balance_infos: [] }), void 0);
  assert.equal(parseBalancePayload({ balance_infos: [{ currency: "CNY" }] }), void 0);
  assert.equal(parseBalancePayload(null), void 0);
});

test("the route answers the balance, caches it, and honors force", async () => {
  const mock = await startMock((request, response) => {
    assert.equal(request.url, "/user/balance");
    assert.equal(request.headers.authorization, "Bearer sk-test");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(CNY_BODY);
  });
  try {
    const { ctx, routes } = makeCtx({ apiKey: "sk-test" });
    await plugin.apply(ctx, Config({ baseUrl: mock.baseUrl, cacheMs: 60000 }));
    const route = routes[0];
    const first = await (await route.fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
    assert.equal(first.ok, true);
    assert.equal(first.currency, "CNY");
    assert.equal(first.totalBalance, 32.65);
    assert.equal(first.source, "credentials/managed:DEEPSEEK_API_KEY");
    assert.equal(first.lowBalanceThreshold, 5);
    assert.equal(first.cached, false);
    assert.equal(mock.hits.count, 1);
    const second = await (await route.fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
    assert.equal(second.cached, true);
    assert.equal(mock.hits.count, 1, "a cached read does not touch the upstream API");
    const forced = await (await route.fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}?force=1`))).json();
    assert.equal(forced.cached, false);
    assert.equal(mock.hits.count, 2);
  } finally {
    await mock.stop();
  }
});

test("a failing refresh keeps answering with the last good balance", async () => {
  let fail = false;
  const mock = await startMock((request, response) => {
    if (fail) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end("{}");
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(CNY_BODY);
  });
  try {
    const { ctx, routes } = makeCtx({ apiKey: "sk-test" });
    await plugin.apply(ctx, Config({ baseUrl: mock.baseUrl, cacheMs: 0 }));
    const route = routes[0];
    const good = await (await route.fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
    assert.equal(good.ok, true);
    fail = true;
    const stale = await (await route.fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
    assert.equal(stale.ok, true);
    assert.equal(stale.totalBalance, 32.65);
    assert.equal(stale.stale, true);
    assert.match(stale.error, /HTTP 500/);
  } finally {
    await mock.stop();
  }
});

test("a missing key and an HTTP failure both report a readable error", async () => {
  const noKey = makeCtx();
  await plugin.apply(noKey.ctx, Config({ baseUrl: "http://127.0.0.1:1", cacheMs: 0, apiKeyEnv: "DSH_BALANCE_ABSENT_KEY" }));
  const missing = await (await noKey.routes[0].fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
  assert.equal(missing.ok, false);
  assert.match(missing.error, /DSH_BALANCE_ABSENT_KEY/);

  const mock = await startMock((request, response) => {
    response.writeHead(401, { "content-type": "application/json" });
    response.end('{"error":"Authentication Fails"}');
  });
  try {
    const { ctx, routes } = makeCtx({ apiKey: "sk-bad" });
    await plugin.apply(ctx, Config({ baseUrl: mock.baseUrl, cacheMs: 0 }));
    const denied = await (await routes[0].fetch(new Request(`http://127.0.0.1:3080${BALANCE_PATH}`))).json();
    assert.equal(denied.ok, false);
    assert.match(denied.error, /HTTP 401/);
  } finally {
    await mock.stop();
  }
});

test("resolveApiKey prefers config, then the environment, then the store", async () => {
  const config = normalizeBalanceConfig({ apiKey: "sk-config" });
  assert.deepEqual(await resolveApiKey({}, config), { value: "sk-config", source: "config" });

  const envConfig = normalizeBalanceConfig({ apiKeyEnv: "DSH_BALANCE_TEST_ENV" });
  process.env.DSH_BALANCE_TEST_ENV = "sk-env";
  try {
    assert.deepEqual(await resolveApiKey({}, envConfig), { value: "sk-env", source: "env:DSH_BALANCE_TEST_ENV" });
  } finally {
    delete process.env.DSH_BALANCE_TEST_ENV;
  }
  const withStore = { get: () => ({ resolve: async () => ({ value: "sk-store", source: "managed" }) }) };
  assert.deepEqual(await resolveApiKey(withStore, envConfig), { value: "sk-store", source: "credentials/managed:DSH_BALANCE_TEST_ENV" });
  assert.equal(await resolveApiKey({ get: () => ({ resolve: async () => void 0 }) }, envConfig), void 0);
  // No credentials service at all (a composition without one) must not throw.
  assert.equal(await resolveApiKey({}, normalizeBalanceConfig({ apiKeyEnv: "DSH_BALANCE_TEST_ENV" })), void 0);
});

test("the default export carries the new row identity", () => {
  assert.equal(namedPlugin, plugin);
  assert.equal(plugin.name, "cost-balance-indicator");
  assert.deepEqual(plugin.inject, ["sessionProjections", "tokenMeter", "loader", "settings"]);
  assert.equal(typeof plugin.apply, "function");
  assert.equal(typeof plugin.Config, "function");
});

test("the settings schema accepts a browser-written colour palette", () => {
  const resolved = SettingsConfig({
    pillColors: {
      mode: "single",
      all: { text: "#FF0000" },
      turnBalance: { border: "#00ff00", background: "#0000ff" }
    }
  });
  assert.equal(resolved.pillColors.mode, "single");
  assert.equal(resolved.pillColors.all.text, "#FF0000");
  // Untouched fields resolve to "use the built-in colour".
  assert.equal(resolved.pillColors.all.border, "");
  assert.equal(resolved.pillColors.all.background, "");
  assert.equal(resolved.pillColors.turnBalance.border, "#00ff00");
  assert.equal(resolved.pillColors.turnBalance.background, "#0000ff");
  // Every pill the browser can address exists in the schema.
  for (const key of ["peak", "headerBalance", "turnCost", "turnBalance"]) {
    assert.deepEqual(Object.keys(resolved.pillColors[key]).sort(), ["background", "border", "text"]);
  }
  // The schema is also what the plugin registers with the settings service.
  assert.equal(typeof SettingsConfig({}).pillColors.mode, "string");
});

test("live: reads the real DeepSeek key balance", async (t) => {
  const key = discoverKey();
  if (key === void 0) {
    t.skip("no DEEPSEEK_API_KEY in the environment or the managed credential store");
    return;
  }
  const reader = createBalanceReader({ get: () => ({ resolve: async () => ({ value: key, source: "test" }) }) }, normalizeBalanceConfig({}));
  const payload = await reader.read(false);
  assert.equal(payload.ok, true, payload.error);
  assert.ok(Number.isFinite(payload.totalBalance), "the balance is a finite number");
  console.log(`live balance: ${payload.currency} ${payload.totalBalance} (${payload.source})`);
});
