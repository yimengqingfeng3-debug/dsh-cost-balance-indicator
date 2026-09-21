// dsh-cost-balance-indicator host half — a merge of two DSH Web plugins:
//
//   * dsh-peak-indicator 0.1.26 (MIT, Copyright (c) 2026 Jim,
//     https://github.com/future007s/dsh-peak-indicator), including this
//     profile's local compatibility patch (the settingsNamespace shim) and its
//     CNY price table/labels — see NOTICE.
//   * dsh-balance-indicator 0.1.0 (this workspace's own plugin).
//
// Provides, from one plugin row:
//  1. The `peakCost` session projection: replays the session log, prices every
//     usage record at the rates in effect at that record's own timestamp, and
//     exposes the session total, per-model buckets, and per-message costs.
//  2. The auto-compaction cost guard: maps a context budget onto
//     compaction-basic's trigger threshold and logs the estimated savings.
//  3. One authenticated exact Fetch route, `GET /api/deepseek.balance`, serving
//     the current DeepSeek API key balance, plus the `deepseekBalance` host
//     service. The API key never reaches the browser.
//
// Policy (official DeepSeek price page):
//   before 2026-08-17: flat legacy prices (no peak/off-peak)
//   from   2026-08-17: peak = Beijing 09:00-12:00 and 14:00-18:00
//                      offpeak = every other minute, at half the peak price
//   from   2026-08-23: Saturday and Sunday (Beijing time) are off-peak all day
import z from "@deepseek-ai/schemastery";
import { z as zod } from "zod";

// --- settings-namespace validation -------------------------------------------
// @deepseek-ai/dsh-settings exported `settingsNamespace` (a namespace branding
// helper) up to 0.1.1-rc.2; from 0.1.2-alpha.2 on it is a type only and the
// runtime twin is the non-exported `parseSettingsNamespace`. Same contract,
// reproduced verbatim so this plugin loads against core 0.1.5-rc.x without
// depending on that export. (Local patch A carried over from dsh-peak-indicator.)
const SETTINGS_NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
const settingsNamespace = (value) => {
	if (!SETTINGS_NAMESPACE_PATTERN.test(value)) throw new TypeError(`settings namespace "${value}" must match ${String(SETTINGS_NAMESPACE_PATTERN)}`);
	return value;
};

// ============================================================================
// Pricing tables (from dsh-peak-indicator)
// ============================================================================

/** Default peak windows, Beijing hours (start inclusive, end exclusive). */
const DEFAULT_PEAK_WINDOWS = [[9, 12], [14, 18]];
/** Beijing is UTC+8, no DST. */
const BEIJING_OFFSET_MINUTES = 8 * 60;
/** Off-peak price ratio vs. peak. */
const OFF_PEAK_DISCOUNT = 0.5;
/** Flat legacy prices per 1M tokens (CNY) in effect before 2026-08-17. */
const LEGACY_PRICES = {
  "deepseek-v4-flash": { input: 1.0, output: 2.0, cacheHitInput: 0.02 },
  "deepseek-v4-pro": { input: 3.0, output: 6.0, cacheHitInput: 0.025 }
};
/**
 * Peak prices per 1M tokens (CNY), DeepSeek official price list
 * (https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ ; values as of the
 * 2026-09-10 12:00 Beijing adjustment). Off-peak is exactly half of peak.
 * Update this table when DeepSeek changes its price list.
 */
const MODEL_PRICES = {
  "deepseek-v4-flash": { input: 2, output: 8, cacheHitInput: 0.04 },
  "deepseek-v4-pro": { input: 9, output: 27, cacheHitInput: 0.3 }
};
/**
 * Approximate flat prices per 1M tokens (CNY) for common non-DeepSeek models.
 * These are best-effort public rates — override or add models via the plugin
 * `config.prices` (any model id). Non-DeepSeek models have no peak/off-peak.
 */
const OTHER_MODEL_PRICES = {
  "gpt-4o": { input: 18, output: 72, cacheHitInput: 9 },
  "gpt-4o-mini": { input: 1.1, output: 4.3, cacheHitInput: 0.55 },
  "gpt-4.1": { input: 16, output: 64, cacheHitInput: 8 },
  "gpt-4.1-mini": { input: 3.6, output: 14.4, cacheHitInput: 1.8 },
  "claude-opus-4": { input: 112.5, output: 562.5, cacheHitInput: 56.25 },
  "claude-sonnet-4": { input: 22.5, output: 112.5, cacheHitInput: 11.25 },
  "claude-sonnet-4-5": { input: 22.5, output: 112.5, cacheHitInput: 11.25 },
  "claude-haiku-4": { input: 7.2, output: 36, cacheHitInput: 3.6 },
  "gemini-2.5-pro": { input: 9.4, output: 56.3, cacheHitInput: 4.7 },
  "gemini-2.5-flash": { input: 2.2, output: 13.3, cacheHitInput: 1.1 },
  "qwen3-max": { input: 8.6, output: 43.2, cacheHitInput: 4.3 },
  "glm-4.6": { input: 7, output: 14, cacheHitInput: 3.5 },
  "kimi-k2": { input: 12, output: 48, cacheHitInput: 6 }
};

// ============================================================================
// Balance reader (from dsh-balance-indicator)
// ============================================================================

/** Authenticated exact Fetch route registered on Connection's shared API channel. */
const BALANCE_PATH = "/api/deepseek.balance";
/** Official DeepSeek API origin. */
const DEFAULT_BASE_URL = "https://api.deepseek.com";
/** Per-request socket deadline for the balance call. */
const DEFAULT_TIMEOUT_MS = 10000;
/** How long one successful (or failed) read answers following reads. */
const DEFAULT_CACHE_MS = 20000;
/** Balance below this many CNY renders the warning color in the browser half. */
const DEFAULT_LOW_THRESHOLD = 5;
/** Credential-store reference names are POSIX shell identifiers. */
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** The reference the DeepSeek adapter itself resolves. */
const DEFAULT_KEY_REF = "DEEPSEEK_API_KEY";

/**
 * Normalize the balance fields of the row config. Every field is optional and
 * every invalid value falls back to its default, because a plugin must not fail
 * a whole profile boot over a typo.
 * @param config - raw loader row config (may be undefined).
 * @returns the normalized balance config.
 */
function normalizeBalanceConfig(config) {
  const raw = typeof config === "object" && config !== null ? config : {};
  const number = (value, fallback) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback);
  const text = (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0);
  const baseUrl = text(raw.baseUrl);
  const apiKeyEnv = text(raw.apiKeyEnv);
  return {
    baseUrl: baseUrl === void 0 ? DEFAULT_BASE_URL : baseUrl.replace(/\/+$/, ""),
    apiKeyEnv: apiKeyEnv !== void 0 && REF_PATTERN.test(apiKeyEnv) ? apiKeyEnv : DEFAULT_KEY_REF,
    apiKey: text(raw.apiKey),
    timeoutMs: number(raw.timeoutMs, DEFAULT_TIMEOUT_MS),
    cacheMs: number(raw.cacheMs, DEFAULT_CACHE_MS),
    lowBalanceThreshold: number(raw.lowBalanceThreshold, DEFAULT_LOW_THRESHOLD)
  };
}

/** Parse one `total_balance`-shaped field; the API sends decimal strings. */
function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return void 0;
}

/**
 * Pick the balance row to display: the CNY wallet when the key has one, the
 * first wallet otherwise. Never throws on a malformed payload.
 * @param payload - decoded `GET /user/balance` body.
 * @returns the selected wallet plus every wallet, or undefined when unusable.
 */
function parseBalancePayload(payload) {
  if (typeof payload !== "object" || payload === null) return void 0;
  const infos = Array.isArray(payload.balance_infos) ? payload.balance_infos : [];
  const wallets = [];
  for (const info of infos) {
    if (typeof info !== "object" || info === null) continue;
    const totalBalance = parseAmount(info.total_balance);
    if (totalBalance === void 0) continue;
    wallets.push({
      currency: typeof info.currency === "string" && info.currency.length > 0 ? info.currency : "CNY",
      totalBalance,
      grantedBalance: parseAmount(info.granted_balance) ?? 0,
      toppedUpBalance: parseAmount(info.topped_up_balance) ?? 0
    });
  }
  if (wallets.length === 0) return void 0;
  const primary = wallets.find((wallet) => wallet.currency === "CNY") ?? wallets[0];
  return {
    primary,
    wallets,
    isAvailable: payload.is_available !== false
  };
}

/**
 * Resolve the DeepSeek API key without ever logging it or sending it to the
 * browser. Precedence: explicit config, the launching environment, then the
 * credential store (the same reference the DeepSeek adapter resolves, so a key
 * rotated in the Models page is picked up on the next read).
 *
 * The store is read through `ctx.get` rather than an injected property: the
 * pricing half of this plugin must keep loading in compositions without a
 * credentials service.
 * @param ctx - host plugin context.
 * @param config - normalized balance config.
 * @returns `{ value, source }`, or undefined when no key is available.
 */
async function resolveApiKey(ctx, config) {
  if (config.apiKey !== void 0) return { value: config.apiKey, source: "config" };
  const ambient = process.env[config.apiKeyEnv];
  if (typeof ambient === "string" && ambient.length > 0) return { value: ambient, source: `env:${config.apiKeyEnv}` };
  const credentials = typeof ctx.get === "function" ? ctx.get("credentials") : ctx.credentials;
  if (credentials === void 0 || typeof credentials.resolve !== "function") return void 0;
  // `credentialRef` is a validation brand; the runtime value is the plain name.
  const hit = await credentials.resolve(config.apiKeyEnv);
  if (hit === void 0 || typeof hit.value !== "string" || hit.value.length === 0) return void 0;
  return { value: hit.value, source: hit.source === void 0 ? `credentials:${config.apiKeyEnv}` : `credentials/${hit.source}:${config.apiKeyEnv}` };
}

/**
 * Call the official balance endpoint once and decode it.
 * @param options - base URL, key, and deadline.
 * @returns the decoded balance snapshot.
 * @throws Error with a human-readable message on transport, HTTP, or shape failures.
 */
async function fetchBalance({ baseUrl, apiKey, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let body;
  try {
    response = await fetch(`${baseUrl}/user/balance`, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });
    body = await response.text();
  } catch (error) {
    if (error !== null && typeof error === "object" && error.name === "AbortError") throw new Error(`请求超时（${timeoutMs}ms）`);
    throw new Error(`无法连接 ${baseUrl}：${error?.message ?? String(error)}`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const detail = body.length > 0 ? ` ${body.slice(0, 200)}` : "";
    throw new Error(`余额接口返回 HTTP ${response.status}${detail}`);
  }
  let decoded;
  try {
    decoded = JSON.parse(body);
  } catch {
    throw new Error("余额接口返回的不是 JSON");
  }
  const parsed = parseBalancePayload(decoded);
  if (parsed === void 0) throw new Error("余额接口没有返回可用的余额条目");
  return parsed;
}

/**
 * Build the reader that backs both the HTTP route and the host service: one
 * cached snapshot, one in-flight call, and a stale fallback so a transient
 * network failure never blanks the chip.
 * @param ctx - host plugin context carrying the optional credentials service.
 * @param config - normalized balance config.
 * @returns `{ read(force) }` resolving to the wire payload.
 */
function createBalanceReader(ctx, config) {
  let cache;
  let inflight;
  const read = async (force) => {
    const now = Date.now();
    if (force !== true && cache !== void 0 && now - cache.at < config.cacheMs) return { ...cache.payload, cached: true };
    if (inflight !== void 0) return inflight;
    inflight = (async () => {
      let snapshot;
      try {
        const key = await resolveApiKey(ctx, config);
        if (key === void 0) {
          snapshot = {
            ok: false,
            error: `没有找到 DeepSeek API Key（配置项 apiKey、环境变量 ${config.apiKeyEnv} 或凭证库都为空）`,
            fetchedAt: Date.now()
          };
        } else {
          const balance = await fetchBalance({ baseUrl: config.baseUrl, apiKey: key.value, timeoutMs: config.timeoutMs });
          snapshot = {
            ok: true,
            isAvailable: balance.isAvailable,
            currency: balance.primary.currency,
            totalBalance: balance.primary.totalBalance,
            grantedBalance: balance.primary.grantedBalance,
            toppedUpBalance: balance.primary.toppedUpBalance,
            wallets: balance.wallets,
            source: key.source,
            lowBalanceThreshold: config.lowBalanceThreshold,
            fetchedAt: Date.now()
          };
        }
      } catch (error) {
        snapshot = { ok: false, error: error?.message ?? String(error), fetchedAt: Date.now() };
      }
      if (snapshot.ok === true) {
        cache = { at: Date.now(), payload: snapshot };
        return { ...snapshot, cached: false };
      }
      // A failed refresh keeps answering with the last known good balance and
      // reports why it may be stale.
      if (cache !== void 0) return { ...cache.payload, cached: true, stale: true, error: snapshot.error };
      cache = { at: Date.now(), payload: snapshot };
      return snapshot;
    })().finally(() => {
      inflight = void 0;
    });
    return inflight;
  };
  return { read };
}

// ============================================================================
// Configuration (dsh-peak-indicator's schema + the balance fields)
// ============================================================================

/** Host configuration: all fields optional; policy defaults track the official announcement. */
const Config = z.object({
  peakWindows: z.array(z.tuple([z.number(), z.number()])).default(DEFAULT_PEAK_WINDOWS),
  beijingOffsetMinutes: z.number().default(BEIJING_OFFSET_MINUTES),
  offPeakDiscount: z.number().default(OFF_PEAK_DISCOUNT),
  policyEffectiveDate: z.string().default("2026-08-17T00:00:00+08:00"),
  weekendOffPeakEffectiveDate: z.string().default("2026-08-23T00:00:00+08:00"),
  prices: z.dict(z.object({
    input: z.number(),
    output: z.number(),
    cacheHitInput: z.number()
  })).default({}),
  /**
   * Auto-compaction cost guard: maps a context budget onto the compaction
   * service's trigger threshold so long sessions compact early (cheaper
   * cache re-reads), and logs the estimated savings. On by default.
   */
  autoCompact: z.object({
    enabled: z.boolean().default(true),
    /** Compact when the session context exceeds this many tokens. */
    contextBudget: z.number().default(100000),
    /** Recent tokens kept after a compaction (delegated to the service). */
    retainTokens: z.number().default(15000),
    /** Model context window used to derive the trigger ratio. */
    referenceWindow: z.number().default(256000),
    logSavings: z.boolean().default(true)
  }).default({}),
  /** Credential reference the balance route resolves (default DEEPSEEK_API_KEY). */
  apiKeyEnv: z.string().default(DEFAULT_KEY_REF),
  /** Explicit key for the balance route; normally leave unset and use the store. */
  apiKey: z.string().default(""),
  /** Balance API origin (self-hosted or proxied gateways). */
  baseUrl: z.string().default(DEFAULT_BASE_URL),
  /** Balance cache lifetime in milliseconds. */
  cacheMs: z.number().default(DEFAULT_CACHE_MS),
  /** Balance request deadline in milliseconds. */
  timeoutMs: z.number().default(DEFAULT_TIMEOUT_MS),
  /** Balance at or below this many CNY renders the warning color. */
  lowBalanceThreshold: z.number().default(DEFAULT_LOW_THRESHOLD)
});

/**
 * Map a token budget onto the compaction service's trigger ratio
 * (threshold = contextWindow * ratio), clamped to a sane range.
 */
function compactionRatioForBudget(budgetTokens, referenceWindow) {
  const ratio = budgetTokens / Math.max(1, referenceWindow);
  return Math.min(0.9, Math.max(0.05, ratio));
}

/**
 * Estimated per-step savings (CNY) of removing `removedTokens` from the
 * context: those tokens would otherwise be re-sent (uncached) on every
 * following step, priced at the model's input rate.
 */
function estimateCompactSavings(removedTokens, price) {
  return (removedTokens * (price?.input ?? 0)) / 1e6;
}

/** Minutes since Beijing midnight for `now`. */
function beijingMinutes(now) {
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + BEIJING_OFFSET_MINUTES) % 1440;
}

/** Beijing weekday (0 = Sunday, 6 = Saturday). */
function beijingDay(now) {
  return new Date(now.getTime() + BEIJING_OFFSET_MINUTES * 60 * 1000).getUTCDay();
}

/**
 * Resolve the billing period for a moment in time.
 * @returns period ("peak" | "offpeak") plus the Beijing minute of day.
 */
function currentPeriod(now, config) {
  if (now.getTime() >= Date.parse(config.weekendOffPeakEffectiveDate)) {
    const day = beijingDay(now);
    if (day === 0 || day === 6) return { period: "offpeak", beijingMinutes: beijingMinutes(now) };
  }
  const bj = beijingMinutes(now);
  const peak = config.peakWindows.some(([startHour, endHour]) => bj >= startHour * 60 && bj < endHour * 60);
  return { period: peak ? "peak" : "offpeak", beijingMinutes: bj };
}

/** Billing period at a Unix-millisecond timestamp. */
function periodAt(timeMs, config) {
  return currentPeriod(new Date(timeMs), config).period;
}

/** Whether a model id is a DeepSeek flash/pro model (peak/off-peak applies). */
function isDeepseekModel(provider, model) {
  const p = String(provider ?? "").toLowerCase();
  const m = String(model ?? "").toLowerCase();
  return p.includes("deepseek") && (m.includes("flash") || m.includes("pro"));
}

/**
 * Resolve a price entry for a model id in a table: exact id first, then the
 * longest prefix (handles dated variants like gpt-4o-2024-08-06), then the
 * DeepSeek suffix alias ("deepseek-v4-flash" -> "flash"). Null when unknown.
 */
function resolveModelPrice(model, table) {
  const m = String(model ?? "").toLowerCase();
  if (m.length === 0) return null;
  if (table[m] !== void 0) return table[m];
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (m.startsWith(key)) return table[key];
  }
  for (const key of keys) {
    const alias = key.replace("deepseek-v4-", "");
    if (alias !== key && m.includes(alias)) return table[key];
  }
  return null;
}

/** New-scheme (2026-08-17+) DeepSeek price table with user overrides applied. */
function effectiveNewPrices(config) {
  return { ...MODEL_PRICES, ...config.prices };
}

/**
 * Effective input/output/cache-hit prices per 1M tokens for a model at a
 * moment in time:
 *   DeepSeek flash/pro: flat legacy table before the policy effective date,
 *   then the peak/off-peak table (window factor applied).
 *   Any other model: flat price from the other-model table (no peak/off-peak).
 */
function priceFor(model, period, timeMs, config) {
  const m = String(model ?? "").toLowerCase();
  const isDS = m.includes("deepseek") && (m.includes("flash") || m.includes("pro"));
  if (isDS) {
    if (timeMs < Date.parse(config.policyEffectiveDate)) {
      return resolveModelPrice(model, LEGACY_PRICES);
    }
    const peak = resolveModelPrice(model, effectiveNewPrices(config));
    if (peak === null) return null;
    const factor = period === "offpeak" ? config.offPeakDiscount : 1;
    return {
      input: peak.input * factor,
      output: peak.output * factor,
      cacheHitInput: peak.cacheHitInput * factor
    };
  }
  return resolveModelPrice(model, { ...OTHER_MODEL_PRICES, ...config.prices });
}

/** Projection value schema (validated by the session-projection registry). */
const projectionSchema = zod.object({
  currency: zod.string(),
  totalCost: zod.number().nonnegative(),
  byModel: zod.record(zod.object({
    uncachedInputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    cost: zod.number().nonnegative()
  }).strict()),
  messageCosts: zod.record(zod.object({
    provider: zod.string(),
    model: zod.string(),
    turn: zod.number().int().nonnegative(),
    period: zod.string(),
    cost: zod.number().nonnegative()
  }).strict())
}).strict();

/** Internal fold state persisted by the session-projection cache. */
const projectionStateSchema = zod.object({
  provider: zod.string().optional(),
  model: zod.string().optional(),
  byModel: zod.record(zod.object({
    uncachedInputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    cost: zod.number().nonnegative()
  }).strict()),
  messageCosts: zod.record(zod.object({
    provider: zod.string(),
    model: zod.string(),
    turn: zod.number().int().nonnegative(),
    period: zod.string(),
    cost: zod.number().nonnegative()
  }).strict()),
  last: zod.object({
    turn: zod.number().int().nonnegative(),
    step: zod.number().int().nonnegative(),
    buckets: zod.object({
      uncachedInputTokens: zod.number().int().nonnegative(),
      outputTokens: zod.number().int().nonnegative(),
      cacheReadTokens: zod.number().int().nonnegative(),
      cacheWriteTokens: zod.number().int().nonnegative()
    }).strict()
  }).strict().nullable()
}).strict();

/** CNY cost for a usage record at the given per-1M prices. */
function priceUsage(price, usage) {
  const input = price?.input ?? 0;
  const output = price?.output ?? 0;
  const cacheHitInput = price?.cacheHitInput ?? 0;
  return (usage.inputTokens * input + usage.outputTokens * output + (usage.cacheReadTokens ?? 0) * cacheHitInput) / 1e6;
}

/**
 * Create the "peakCost" session projection: replays request/header and usage
 * events, prices each event's tokens at the rates in effect at its own time,
 * and exposes the session total, per-model buckets and per-message costs.
 */
function createPeakCostProjection(config) {
  return {
    key: "peakCost",
    // Kept for DSH releases that used the pre-rc.2 projection field name.
    schema: projectionSchema,
    stateSchema: projectionStateSchema,
    init: () => ({
      provider: void 0,
      model: void 0,
      byModel: {},
      messageCosts: {},
      last: null
    }),
    apply: (state, event) => {
      if (event.type === "request/header") {
        const headerConfig = event.data.header.config;
        if (typeof headerConfig !== "object" || headerConfig === null) return state;
        const provider = headerConfig.provider;
        const model = headerConfig.model;
        if (typeof provider !== "string" || typeof model !== "string" || provider.length === 0 || model.length === 0) return state;
        if (state.provider === provider && state.model === model) return state;
        return { ...state, provider, model };
      }
      let turn;
      let step;
      let usage;
      let messageId;
      if (event.type === "assistant/chunk" && event.data.chunk.type === "usage") {
        turn = event.data.turn;
        step = event.data.step;
        usage = event.data.chunk.usage;
      } else if (event.type === "assistant/message" && event.data.usage !== void 0) {
        turn = event.data.turn;
        step = event.data.step;
        usage = event.data.usage;
        messageId = event.data.message?.id;
      } else {
        return state;
      }
      const provider = state.provider;
      const model = state.model;
      const modelKey = typeof provider === "string" && typeof model === "string" ? `${provider}/${model}` : model ?? "unknown";
      const period = periodAt(event.time ?? Date.now(), config);
      const price = priceFor(model, period, event.time ?? Date.now(), config);
      if (price === null) return state;
      const cost = priceUsage(price, usage);
      const previous = state.last !== null && state.last.turn === turn && state.last.step === step ? state.last.buckets : void 0;
      const previousCost = previous === void 0 ? 0 : priceUsage(price, {
        inputTokens: previous.uncachedInputTokens,
        outputTokens: previous.outputTokens,
        cacheReadTokens: previous.cacheReadTokens,
        cacheWriteTokens: previous.cacheWriteTokens
      });
      const prior = state.byModel[modelKey];
      const nextBucket = {
        uncachedInputTokens: (prior?.uncachedInputTokens ?? 0) - (previous?.uncachedInputTokens ?? 0) + usage.inputTokens,
        outputTokens: (prior?.outputTokens ?? 0) - (previous?.outputTokens ?? 0) + usage.outputTokens,
        cacheReadTokens: (prior?.cacheReadTokens ?? 0) - (previous?.cacheReadTokens ?? 0) + (usage.cacheReadTokens ?? 0),
        cacheWriteTokens: (prior?.cacheWriteTokens ?? 0) - (previous?.cacheWriteTokens ?? 0) + (usage.cacheWriteTokens ?? 0),
        cost: Math.max(0, (prior?.cost ?? 0) - previousCost + cost)
      };
      return {
        ...state,
        last: {
          turn,
          step,
          buckets: {
            uncachedInputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cacheReadTokens: usage.cacheReadTokens ?? 0,
            cacheWriteTokens: usage.cacheWriteTokens ?? 0
          }
        },
        byModel: {
          ...state.byModel,
          [modelKey]: nextBucket
        },
        ...messageId !== void 0 ? {
          messageCosts: {
            ...state.messageCosts,
            [messageId]: {
              provider,
              model,
              turn,
              period,
              cost
            }
          }
        } : {}
      };
    },
    wire: {
      viewSchema: projectionSchema,
      view: (state) => {
        let totalCost = 0;
        const byModel = {};
        for (const [key, bucket] of Object.entries(state.byModel)) {
          byModel[key] = {
            uncachedInputTokens: bucket.uncachedInputTokens,
            outputTokens: bucket.outputTokens,
            cacheReadTokens: bucket.cacheReadTokens,
            cacheWriteTokens: bucket.cacheWriteTokens,
            cost: bucket.cost
          };
          totalCost += bucket.cost;
        }
        return {
          currency: "CNY",
          totalCost,
          byModel,
          messageCosts: state.messageCosts
        };
      }
    },
    // Kept as a read-side alias for older DSH releases and the pure-fold test
    // harness. rc.2 uses wire.view above.
    view: (state) => {
      let totalCost = 0;
      const byModel = {};
      for (const [key, bucket] of Object.entries(state.byModel)) {
        byModel[key] = {
          uncachedInputTokens: bucket.uncachedInputTokens,
          outputTokens: bucket.outputTokens,
          cacheReadTokens: bucket.cacheReadTokens,
          cacheWriteTokens: bucket.cacheWriteTokens,
          cost: bucket.cost
        };
        totalCost += bucket.cost;
      }
      return {
        currency: "CNY",
        totalCost,
        byModel,
        messageCosts: state.messageCosts
      };
    },
    // rc.2 requires explicit internal-state and wire schemas. Bump so old
    // cache rows are never treated as valid under the new projection contract.
    // 5 = 2026-09-17: the price table moved from the USD list to the official
    // CNY (yuan) list, so rows folded with USD prices must be recomputed.
    stateVersion: 5
  };
}

// ============================================================================
// Plugin row
// ============================================================================

var name = "cost-balance-indicator";
// `compaction` is optional across DSH releases. Do not inject it as a hard
// dependency: older/current profiles may not register that service during boot,
// which would leave this otherwise usable plugin stuck in `pending`.
// `connection` and `credentials` are deliberately NOT listed here either: the
// balance half waits for the route registry through ctx.inject below, so the
// pricing half still loads in compositions without a Web carrier.
var inject = ["sessionProjections", "tokenMeter", "loader", "settings"];
const SETTINGS_NS = settingsNamespace("cost-balance-indicator");
/**
 * The colour section the browser half writes: the mode switch position plus one
 * entry per scope. An empty string means "keep the built-in colour for that
 * field", so clearing a field restores the plugin's own palette. Declaring the
 * exact shape here matters: the settings service validates every write against
 * this schema, so an undeclared section would be rejected.
 */
const PillColor = z.object({
  text: z.string().default(""),
  border: z.string().default(""),
  background: z.string().default("")
});
const PillColors = z.object({
  /** "all" = the right-hand position of the overlay switch (the default). */
  mode: z.string().default("all"),
  all: PillColor.default({}),
  peak: PillColor.default({}),
  headerBalance: PillColor.default({}),
  turnCost: PillColor.default({}),
  turnBalance: PillColor.default({})
});
const SettingsConfig = z.object({
  autoCompact: z.object({
    enabled: z.boolean().default(true),
    contextBudget: z.number().default(100000),
    retainTokens: z.number().default(15000),
    referenceWindow: z.number().default(256000),
    logSavings: z.boolean().default(true)
  }).default({}),
  pillColors: PillColors.default({})
});

/**
 * Point compaction-basic at this plugin's budget.
 * @returns true when the loader row was found and updated, false when the
 * profile has no `compaction-basic` to configure.
 */
function configureCompaction(ctx, value) {
  const ac = value.autoCompact;
  if (!ac.enabled) return false;
  let entry;
  for (const id of ["compaction-basic", "compaction:compaction-basic", "agent:compaction:compaction-basic"]) {
    try {
      entry = ctx.loader.resolve(id);
      if (entry !== void 0) break;
    } catch {
      // Try the next possible scope-qualified id.
    }
  }
  if (entry === void 0) {
    ctx.logger?.warn("cost-balance-indicator: auto-compact requested, but compaction-basic is not present in this profile");
    return false;
  }
  ctx.loader.update("compaction-basic", {
    disabled: false,
    config: {
      thresholdRatio: compactionRatioForBudget(ac.contextBudget, ac.referenceWindow),
      retainTokens: ac.retainTokens,
      auto: true
    }
  });
  return true;
}

/** Track compaction savings per session for the auto-compact log line. */
function watchCompactionSavings(ctx, config, ac) {
  const statsBySession = /* @__PURE__ */ new Map();
  ctx.on("agent/pre-step", async ({ agent }, next) => {
    try {
      const session = agent?.session;
      const meter = ctx.tokenMeter;
      if (session === void 0 || meter === void 0) return next();
      const total = meter.measure(session).totalTokens;
      const rec = statsBySession.get(session.id) ?? { lastTokens: void 0, compactCount: 0, removedTokens: 0, savedPerStep: 0 };
      if (typeof rec.lastTokens === "number" && total < rec.lastTokens - 1000) {
        const removed = rec.lastTokens - total;
        rec.compactCount += 1;
        rec.removedTokens += removed;
        const model = agent.options?.model;
        const price = priceFor(model, periodAt(Date.now(), config), Date.now(), config);
        const perStep = estimateCompactSavings(removed, price);
        rec.savedPerStep += perStep;
        if (ac.logSavings) ctx.logger?.info(`cost-balance-indicator: compaction detected — removed ~${removed.toLocaleString()} tokens (${rec.compactCount} total), ~\u00A5${perStep.toFixed(4)} saved per following step`);
      }
      rec.lastTokens = total;
      statsBySession.set(session.id, rec);
    } catch (error) {
      ctx.logger?.warn(`cost-balance-indicator: auto-compact tracking failed: ${error.message ?? error}`);
    }
    return next();
  });
  ctx.provide("peakCompactStats", {
    get: (sessionId) => statsBySession.get(sessionId)
  });
}

/**
 * Mount the authenticated balance route and the `deepseekBalance` service.
 * Waits for the Web route registry, so a composition without a Web carrier
 * keeps the pricing half and simply has no balance chip.
 */
function applyBalance(ctx, rawConfig) {
  const config = normalizeBalanceConfig(rawConfig);
  ctx.inject(["connection"], (scope) => {
    const reader = createBalanceReader(scope, config);
    scope.provide("deepseekBalance", { read: reader.read, config });
    scope.effect(() => scope.connection.fetch.register({
      path: BALANCE_PATH,
      methods: ["GET"],
      requestBody: "buffered",
      fetch: async (request) => {
        const force = new URL(request.url).searchParams.get("force") === "1";
        const payload = await reader.read(force);
        return Response.json(payload, { headers: { "cache-control": "no-store" } });
      }
    }), "cost-balance-indicator: balance route");
    scope.logger?.info(`cost-balance-indicator: serving ${BALANCE_PATH} (key from ${config.apiKeyEnv}, cache ${config.cacheMs}ms)`);
  });
}

async function apply(ctx, config) {
  // --- pricing, session cost, auto-compaction ------------------------------
  ctx.sessionProjections.register(createPeakCostProjection(config));
  const settings = ctx.settings.register(SETTINGS_NS, SettingsConfig, { base: { autoCompact: config.autoCompact }, applies: "live" });
  settings.watch(async (next) => {
    if (next.autoCompact.enabled) await configureCompaction(ctx, next);
  });
  const ac = config.autoCompact;
  if (ac.enabled) {
    // compaction-basic is inside the preset's loader tree, not a host service.
    // Configure it through the loader so users only need this plugin's config.
    try {
      const configured = await configureCompaction(ctx, { autoCompact: ac });
      if (configured) {
        ctx.logger?.info(`cost-balance-indicator: auto-compact enabled — compact at ~${ac.contextBudget} tokens (ratio ${compactionRatioForBudget(ac.contextBudget, ac.referenceWindow).toFixed(3)}), retain ~${ac.retainTokens}`);
        watchCompactionSavings(ctx, config, ac);
      }
    } catch (error) {
      ctx.logger?.warn(`cost-balance-indicator: failed to configure compaction-basic: ${error.message ?? error}`);
    }
  }
  // --- DeepSeek key balance -------------------------------------------------
  applyBalance(ctx, config);
}

var plugin = { apply, inject, name, Config };

export {
  BALANCE_PATH,
  BEIJING_OFFSET_MINUTES,
  Config,
  DEFAULT_BASE_URL,
  DEFAULT_CACHE_MS,
  DEFAULT_KEY_REF,
  DEFAULT_LOW_THRESHOLD,
  DEFAULT_PEAK_WINDOWS,
  DEFAULT_TIMEOUT_MS,
  LEGACY_PRICES,
  MODEL_PRICES,
  OFF_PEAK_DISCOUNT,
  OTHER_MODEL_PRICES,
  PillColor,
  PillColors,
  SettingsConfig,
  apply,
  beijingDay,
  beijingMinutes,
  compactionRatioForBudget,
  configureCompaction,
  createBalanceReader,
  createPeakCostProjection,
  currentPeriod,
  effectiveNewPrices,
  estimateCompactSavings,
  fetchBalance,
  inject,
  isDeepseekModel,
  name,
  normalizeBalanceConfig,
  parseAmount,
  parseBalancePayload,
  periodAt,
  plugin,
  plugin as default,
  priceFor,
  resolveApiKey,
  resolveModelPrice
};
