// Client-half tests for dsh-cost-balance-indicator (the merged plugin).
//
// Loads the hand-built bundle through a stub `window.__ModuleLoader__`, renders
// every surface with a minimal React stub, and asserts what the merge promises:
// one bundle registers the header badge, the turn price chip, the settings card
// and the balance pill twice — once to the right of the header badge and once to
// the right of the turn price chip — with the same palette and the same vertical
// size in both places.
//
// The second half covers the colour overlay: the four pills keep their built-in
// palette until a custom colour is set, the overlay writes to the global scope
// by default and to the hovered pill in "single" mode, and the overlay chrome is
// built from theme tokens so it follows the active skin.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, "..", "lib", "client.js");

/** Load the bundle with a stubbed module loader and a minimal React. */
function loadBundle() {
  const source = readFileSync(bundlePath, "utf8");
  let captured;
  globalThis.window = { __ModuleLoader__: { load: (entry) => { captured = entry; } } };
  new Function("window", source)(globalThis.window);
  assert.equal(captured.id, "dsh-cost-balance-indicator");
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: (initial) => ({ current: initial }),
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot()
  };
  return captured.factory((id) => {
    assert.equal(id, "react");
    return react;
  });
}

/**
 * The same bundle, loaded with a React stub that REMEMBERS hook state, so one
 * component can be rendered again after an event — the only way to observe a
 * state a click produced. Reset `hooks.slot = 0` before every re-render, exactly
 * as React restarts the hook list per component.
 */
function loadBundleWithHooks() {
  const source = readFileSync(bundlePath, "utf8");
  let captured;
  globalThis.window = { __ModuleLoader__: { load: (entry) => { captured = entry; } } };
  new Function("window", source)(globalThis.window);
  const hooks = { states: [], slot: 0 };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => {
      const at = hooks.slot;
      hooks.slot += 1;
      if (hooks.states[at] === void 0) hooks.states[at] = typeof initial === "function" ? initial() : initial;
      const set = (next) => { hooks.states[at] = typeof next === "function" ? next(hooks.states[at]) : next; };
      return [hooks.states[at], set];
    },
    useEffect: () => {},
    useRef: (initial) => ({ current: initial }),
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot()
  };
  return { exports: captured.factory((id) => react), hooks };
}

/**
 * The bundle with a React stub that RECORDS effects instead of running them, so
 * a test can decide when the commit-style callback fires (React runs it after
 * the commit, i.e. once the panel is in the DOM).
 */
function loadBundleWithEffects() {
  const source = readFileSync(bundlePath, "utf8");
  let captured;
  globalThis.window = { __ModuleLoader__: { load: (entry) => { captured = entry; } } };
  new Function("window", source)(globalThis.window);
  const effects = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect: (callback) => { effects.push(callback); },
    useRef: (initial) => ({ current: initial }),
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot()
  };
  return { exports: captured.factory((id) => react), effects };
}

/**
 * A fake settings scope shaped like the client's real one: `getSnapshot()` with
 * `status`/`writable`, plus `set(field, value)` — the API the plugin must use.
 * `api: "write"`/`api: "mutate"` model older or alternative clients, and every
 * accepted write is recorded in `writes` in the same normalised shape.
 */
function fakeScope(value = {}, options = {}) {
  const listeners = [];
  const writes = [];
  const writable = options.writable !== false;
  const record = (field, next) => { writes.push({ op: "set", path: [field], value: next }); };
  const api = options.api ?? "set";
  const scope = {
    listeners,
    writes,
    value,
    subscribe: (fn) => { listeners.push(fn); return () => {}; },
    getSnapshot: () => ({ status: value === void 0 ? "loading" : "ready", value, base: void 0, user: value, revision: 1, writable, mode: writable ? "host" : "memory" })
  };
  if (api === "set") scope.set = (field, next) => { record(field, next); return Promise.resolve(); };
  if (api === "mutate") scope.mutate = (ops) => { for (const op of ops) record(op.path[0], op.value); return Promise.resolve(); };
  if (api === "write") scope.write = (patch) => { record(patch.path[0], patch.value); return Promise.resolve(); };
  return scope;
}

/** Apply the plugin and capture every registration it makes. */
function mount(exports, options = {}) {
  const registrations = [];
  const dictionaries = {};
  const disposers = [];
  const scope = options.scope ?? fakeScope();
  const ctx = {
    effect: (callback) => { const dispose = callback(); if (typeof dispose === "function") disposers.push(dispose); return () => {}; },
    locale: { register: (ns, dicts) => { dictionaries[ns] = dicts; return () => {}; } },
    modelDirectories: {
      directoryFor: () => ({
        store: { subscribe: () => () => {}, getSnapshot: () => null },
        load: () => Promise.resolve()
      })
    },
    settingsScope: { bind: () => scope },
    slots: {
      inject: (name, callback) => callback(),
      register: (options2, component) => { registrations.push({ options: options2, component }); return () => {}; }
    }
  };
  exports.apply(ctx);
  const t = (ns) => (key, params) => {
    const text = dictionaries[ns].zh[key];
    assert.ok(typeof text === "string", `missing zh string ${ns}/${key}`);
    return params === void 0 ? text : text.replace(/\{(\w+)\}/g, (_, name) => String(params[name]));
  };
  return { registrations, dictionaries, t, scope, disposers };
}

/** The registration for one slot, by its slot id. */
function entryFor(registrations, slot, id) {
  const entry = registrations.find((item) => item.options.name === slot && item.options.id === id);
  assert.ok(entry !== void 0, `no ${slot} registration with id ${id}`);
  return entry;
}

/** Render a registration with its locale-bound `t` plus its injected props. */
function render(entry, mounted, extra = {}) {
  const injected = typeof entry.options.inject === "function" ? entry.options.inject("session-1") : {};
  return entry.component({ t: mounted.t(entry.options.locale), ...injected, ...extra });
}

/**
 * Expand function components the way React would: the stub `createElement`
 * only builds element objects, so a component that returns another component
 * (each pill returns the shared ColorablePill wrapper) must be invoked here.
 */
function expand(element) {
  let node = element;
  for (let depth = 0; depth < 12 && node !== null && typeof node === "object" && typeof node.type === "function"; depth++) {
    const children = node.children ?? [];
    node = node.type({ ...node.props, children: children.length === 1 ? children[0] : children });
  }
  return node;
}

/** Every node of a rendered tree, depth first. */
function collect(node, out = []) {
  if (node === null || node === void 0) return out;
  if (Array.isArray(node)) { for (const child of node) collect(child, out); return out; }
  if (typeof node === "object") {
    out.push(node);
    collect(node.children, out);
  }
  return out;
}

/**
 * Like `expand`, but keeps going: it also renders the function children a host
 * node carries (the panel inside the pill's overlay slot), so a test can look
 * for nodes that only exist inside `PillColorPanel`.
 */
function deepExpand(node) {
  if (node === null || node === void 0) return node;
  if (Array.isArray(node)) return node.map(deepExpand);
  if (typeof node === "object") {
    const children = node.children ?? [];
    const props = { ...node.props, children: children.length === 1 ? children[0] : children };
    if (typeof node.type === "function") return deepExpand(node.type(props));
    return { ...node, props, children: children.map(deepExpand) };
  }
  return node;
}

/** The pill body (the styled span) of a rendered surface. */
function pillOf(element) {
  const host = expand(element);
  const pill = host.children[0];
  assert.equal(typeof pill.props.style, "object");
  return pill;
}

const HEADER = "conversation.session.header.actions";
const TURN = "conversation.chat.assistant-actions";

const READY_STATE = {
  status: "ready",
  error: null,
  data: {
    ok: true,
    currency: "CNY",
    totalBalance: 32.65,
    grantedBalance: 0,
    toppedUpBalance: 32.65,
    isAvailable: true,
    source: "credentials/managed:DEEPSEEK_API_KEY",
    lowBalanceThreshold: 5,
    fetchedAt: Date.UTC(2026, 8, 18, 6, 3, 21)
  }
};

const PROJECTION = {
  totalCost: 0.94,
  messageCosts: { m1: { provider: "deepseek-official", model: "deepseek-v4-flash", turn: 1, period: "offpeak", cost: 0.08 } }
};

/**
 * A model-directory store stub whose current selection is `current`, shaped like
 * the one the desktop client hands the period pill. `current: null` is the
 * still-loading directory.
 */
function modelDirectory(current) {
  return { subscribe: () => () => {}, getSnapshot: () => ({ current }) };
}

/**
 * Render the four pills of one mount.
 * @param options.directory - the model directory the period pill reads; without
 * one its model is unknown, so its label carries no price.
 */
function renderFour(exports, mounted, state = READY_STATE, options = {}) {
  exports.balanceStore.getSnapshot = () => state;
  const header = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-header");
  const period = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-peak");
  const turn = entryFor(mounted.registrations, TURN, "cost-balance-indicator-turn");
  const turnBalance = entryFor(mounted.registrations, TURN, "cost-balance-indicator-balance");
  return {
    // `peak` is the header period pill, `headerBalance` the merged spend+balance one.
    peak: pillOf(render(period, mounted, { directory: options.directory ?? null, load: () => {} })),
    headerBalance: pillOf(render(header, mounted, { useProjection: () => PROJECTION })),
    turnCost: pillOf(render(turn, mounted, { messageId: "m1", useProjection: () => PROJECTION })),
    turnBalance: pillOf(render(turnBalance, mounted))
  };
}

// ------------------------------------------------------------ plugin shape ---

test("one bundle mounts every surface of both merged plugins", () => {
  const exports = loadBundle();
  const { registrations, dictionaries } = mount(exports);
  const ids = registrations.map((item) => `${item.options.name}#${item.options.id}`);
  assert.deepEqual(ids.sort(), [
    `${HEADER}#cost-balance-indicator-header`,
    `${HEADER}#cost-balance-indicator-peak`,
    `${TURN}#cost-balance-indicator-balance`,
    `${TURN}#cost-balance-indicator-turn`,
    "settings.general.item#cost-balance-indicator-compaction-general",
    "settings.plugin.item#cost-balance-indicator-compaction"
  ].sort());
  // Both locale namespaces survive the merge, including the settings, colour and
  // merged-header strings.
  assert.equal(dictionaries[exports.NS_PEAK].zh["turn.cost"], "本轮 ¥{amount}");
  assert.equal(dictionaries[exports.NS_PEAK].zh["settings.compact.title"], "成本与上下文");
  assert.equal(dictionaries[exports.NS_BALANCE].zh["balance.chip"], "余额 ¥{amount}");
  assert.equal(dictionaries[exports.NS_BALANCE].zh["header.spent"], "本会话 ¥{amount}");
  assert.equal(dictionaries[exports.NS_BALANCE].zh["header.separator"], " · ");
  assert.equal(dictionaries[exports.NS_PEAK].zh["colors.title"], "胶囊配色");
  assert.equal(dictionaries[exports.NS_BALANCE].zh["colors.mode.all"], "整体");
  assert.equal(dictionaries[exports.NS_BALANCE].en["colors.mode.single"], "This one");
  assert.equal(exports.NS, exports.NS_PEAK);
});

test("the header merges spend+balance on the left and the period on the right", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const { registrations } = mounted;
  const headerSpend = entryFor(registrations, HEADER, "cost-balance-indicator-header");
  const period = entryFor(registrations, HEADER, "cost-balance-indicator-peak");
  const turnChip = entryFor(registrations, TURN, "cost-balance-indicator-turn");
  const turnBalance = entryFor(registrations, TURN, "cost-balance-indicator-balance");
  // The renderer sorts list slots by ascending order: merged pill, then period.
  assert.equal(headerSpend.options.order, 20);
  assert.equal(period.options.order, 21);
  assert.ok(period.options.order > headerSpend.options.order, "the period pill sits to the right");
  assert.equal(turnChip.options.order, 100);
  assert.equal(turnBalance.options.order, 101);
  assert.equal(headerSpend.options.inject().pillKey, "headerBalance");
  assert.equal(period.options.inject("session-1").directory.getSnapshot(), null);

  // The merged pill shows both money figures joined by a middle dot, and no
  // period state; the period pill shows the state, this period's unit prices and
  // the countdown — with no model directory `renderFour` hands it an unknown
  // model, so it must print no number at all here.
  const pills = renderFour(exports, mounted);
  assert.equal(pills.headerBalance.children[0], "本会话 ¥0.94 · 余额 ¥32.65");
  assert.match(pills.peak.children[0], /闲时|高峰/);
  assert.doesNotMatch(pills.peak.children[0], /¥/);
  assert.doesNotMatch(pills.peak.children[0], /\/M/);
  assert.match(pills.peak.children[0], /后切换$/);
  // Without spend or with an unreadable balance the pill keeps only what it knows.
  exports.balanceStore.getSnapshot = () => READY_STATE;
  const noSpend = pillOf(render(headerSpend, mounted, { useProjection: () => ({ totalCost: 0, messageCosts: {} }) }));
  assert.equal(noSpend.children[0], "余额 ¥32.65");
  const unreadable = pillOf(render(headerSpend, mounted, { useProjection: () => PROJECTION }));
  assert.equal(unreadable.children[0], "本会话 ¥0.94 · 余额 ¥32.65");
  exports.balanceStore.getSnapshot = () => ({ status: "error", data: null, error: "HTTP 401" });
  const failedElement = render(headerSpend, mounted, { useProjection: () => PROJECTION });
  assert.equal(pillOf(failedElement).children[0], "本会话 ¥0.94 · 余额 —");
  // The tooltip travels as a prop into the colour overlay (the pill has no title).
  assert.match(failedElement.props.tip, /本会话累计 token 费用/);
});

test("the turn-tail balance pill still sits right of the turn price chip", () => {
  const exports = loadBundle();
  const { registrations } = mount(exports);
  const turnChip = entryFor(registrations, TURN, "cost-balance-indicator-turn");
  const turnBalance = entryFor(registrations, TURN, "cost-balance-indicator-balance");
  // The renderer sorts list slots by ascending order.
  assert.equal(turnChip.options.order, 100);
  assert.equal(turnBalance.options.order, 101);
  assert.ok(turnBalance.options.order > turnChip.options.order);
  assert.equal(turnBalance.options.inject().pillKey, "turnBalance");
  assert.equal(typeof turnBalance.component, "function");
});

test("the balance pill matches the price chip's vertical size and palette", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const pills = renderFour(exports, mounted);
  for (const key of ["fontSize", "fontWeight", "lineHeight", "padding", "borderRadius", "fontVariantNumeric", "whiteSpace", "marginLeft"]) {
    assert.equal(pills.turnBalance.props.style[key], pills.turnCost.props.style[key], `geometry field ${key}`);
    assert.equal(pills.headerBalance.props.style[key], pills.turnCost.props.style[key], `header geometry field ${key}`);
  }
  assert.equal(pills.turnCost.children[0], "本轮 ¥0.08");
  assert.equal(pills.turnBalance.children[0], "余额 ¥32.65");
  assert.equal(pills.headerBalance.children[0], "本会话 ¥0.94 · 余额 ¥32.65");
  assert.equal(pills.turnBalance.props.style.color, pills.turnCost.props.style.color);
  assert.equal(pills.turnBalance.props.style.background, pills.turnCost.props.style.background);
  assert.equal(pills.turnBalance.props.style.border, pills.turnCost.props.style.border);
  assert.equal(pills.headerBalance.props.style.color, pills.turnBalance.props.style.color);
});

test("a low balance switches to the price chip's alert palette", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const low = { status: "ready", error: null, data: { ...READY_STATE.data, totalBalance: 3.2, toppedUpBalance: 3.2 } };
  const pills = renderFour(exports, mounted, low);
  assert.equal(pills.turnBalance.props.style.color, "#ffffff");
  assert.equal(pills.turnBalance.props.style.background, "#e5484d");
  assert.equal(pills.turnBalance.children[0], "余额 ¥3.20");
});

test("pending and failed reads keep the geometry", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const pending = renderFour(exports, mounted, { status: "idle", data: null, error: null });
  assert.equal(pending.turnBalance.children[0], "余额 …");
  assert.equal(pending.turnBalance.props.style.lineHeight, "18px");
  const failed = renderFour(exports, mounted, { status: "error", data: null, error: "HTTP 401" });
  assert.equal(failed.turnBalance.children[0], "余额 —");
  assert.equal(failed.turnBalance.props.style.padding, "1px 8px");
  assert.equal(failed.turnBalance.props.style.borderRadius, 999);
});

test("the header period pill keeps its peak/off-peak behaviour and countdown", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const badge = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-peak");
  const element = render(badge, mounted, { directory: null, load: () => {} });
  const pill = pillOf(element);
  assert.match(pill.children[0], /闲时|高峰/);
  assert.match(pill.children[0], /后切换$/);
  // With no known model there is no price to show: the session cost lives in the
  // merged pill on the left, and the period pill must never invent a number.
  assert.doesNotMatch(pill.children[0], /¥/, "the session cost moved to the merged pill");
  assert.equal(pill.props.style.lineHeight, "18px");
  // The detail text moved into the colour overlay, so it travels as a prop.
  assert.match(element.props.tip, /切换计价时段/);
});

// ------------------------------------------- period pill unit prices --------

/** The period pill's rendered element for one model selection. */
function periodElement(exports, mounted, current) {
  const badge = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-peak");
  return render(badge, mounted, { directory: modelDirectory(current), load: () => {} });
}

test("the period pill keeps its label clean and puts this period's prices at the bottom of the overlay", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const zh = mounted.dictionaries[exports.NS_PEAK].zh;
  const period = exports.currentPeriod(new Date());
  const element = periodElement(exports, mounted, { provider: "deepseek-official", model: "deepseek-v4-flash" });
  const label = pillOf(element).children[0];
  const prices = exports.modelPrices("deepseek-v4-flash", period);
  // The price moved off the pill: the label is the period and the countdown only,
  // with no ¥ (and therefore no numbers) anywhere on it.
  assert.ok(label.startsWith(zh["badge." + period]), label);
  assert.ok(label.endsWith(zh["badge.next"].replace("{countdown}", "").trimEnd()) || /后切换$/.test(label), label);
  assert.ok(!label.includes("¥"), label);
  assert.ok(!label.includes("/M"), label);
  assert.match(label, /^(\u26A1 高峰|\u{1F4A4} 闲时) · .+ 后切换$/u);
  // The off-peak example from the changelog: 0.04/2/8 halved, cache-hit first.
  assert.deepEqual(exports.modelPrices("deepseek-v4-flash", "offpeak"), { input: 1, output: 4, cacheHitInput: 0.02 });
  // The three official prices now live in ONE row at the bottom of the overlay,
  // in the official order, naming the current period and the unit once.
  assert.equal(
    element.props.priceNote,
    `当前时段（${zh["badge." + period]}）每百万 tokens：缓存命中 ¥${exports.formatPrice(prices.cacheHitInput)} · 未命中 ¥${exports.formatPrice(prices.input)} · 输出 ¥${exports.formatPrice(prices.output)}`
  );
  assert.equal((element.props.priceNote.match(/每百万 tokens/g) ?? []).length, 1, element.props.priceNote);
  // `formatPrice` trims: peak flash is ¥0.04/¥2/¥8, off-peak exactly half.
  assert.deepEqual([exports.formatPrice(prices.cacheHitInput), exports.formatPrice(prices.input), exports.formatPrice(prices.output)],
    period === "offpeak" ? ["0.02", "1", "4"] : ["0.04", "2", "8"]);
  // The tooltip keeps the period, the countdown and the clock — but not a second
  // copy of the numbers, which would be the same three prices twice in one panel.
  const tip = element.props.tip;
  assert.match(tip, /切换计价时段/);
  assert.match(tip, /当前北京时间/);
  assert.doesNotMatch(tip, /每百万 tokens/);
  // The English pair carries the same row and the same "no price" wording.
  const en = mounted.dictionaries[exports.NS_PEAK].en;
  assert.equal(en["colors.price.period"], "Current period ({period}) per 1M tokens: cached \u00A5{cacheHitInput} \u00B7 uncached \u00A5{input} \u00B7 output \u00A5{output}");
  assert.equal(en["colors.price.none"], "No official peak/off-peak price for this model");
});

test("a model with no price entry still gets a labelled row of official prices", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const t = mounted.t(exports.NS_PEAK);
  const zh = mounted.dictionaries[exports.NS_PEAK].zh;
  const period = exports.currentPeriod(new Date());
  // The fallback row itself: BOTH DeepSeek families, priced for the pill's own
  // period, in the official order (cache hit / cache miss / output) and labelled
  // as the official list rather than as this session's model.
  const official = (name) => exports.officialPriceNoteFor(t, name);
  assert.equal(
    official("offpeak"),
    `当前时段（${zh["badge.offpeak"]}）每百万 tokens（官方牌价）：deepseek-flash 命中 ¥0.02 · 未命中 ¥1 · 输出 ¥4；deepseek-v4-pro 命中 ¥0.15 · 未命中 ¥4.5 · 输出 ¥13.5`
  );
  assert.equal(
    official("peak"),
    `当前时段（${zh["badge.peak"]}）每百万 tokens（官方牌价）：deepseek-flash 命中 ¥0.04 · 未命中 ¥2 · 输出 ¥8；deepseek-v4-pro 命中 ¥0.3 · 未命中 ¥9 · 输出 ¥27`
  );
  assert.ok(official(period).startsWith(`当前时段（${zh["badge." + period]}）`), official(period));
  assert.equal((official(period).match(/每百万 tokens/g) ?? []).length, 1, "the unit appears once");
  assert.equal((official(period).match(/官方牌价/g) ?? []).length, 1, "the row says whose prices these are");
  for (const model of exports.OFFICIAL_PRICE_MODELS) {
    assert.ok(official(period).includes(model), `${model} is named`);
  }
  assert.equal(exports.officialPriceNoteFor(t, ""), "", "no period, no row: the caller must state one");
  // A still-loading selection, a non-DeepSeek model name and a DeepSeek model
  // whose price is not in the table: none of them may print a made-up number,
  // and none of them may leave the period pill's row empty.
  const unknown = [null, "mystery-9", "deepseek-v5-flash"];
  for (const model of unknown) {
    assert.equal(exports.modelPrices(model, period), null, `${model} has no price entry`);
    const current = model === "mystery-9" ? { provider: "some-gateway", model } : model === null ? null : { provider: "deepseek-official", model };
    const element = periodElement(exports, mounted, current);
    const label = pillOf(element).children[0];
    if (model === "mystery-9") {
      // Not a DeepSeek flash/pro model: the badge stays the "other model" one, and
      // the row says the peak/off-peak price simply does not apply to it.
      assert.equal(label, zh["badge.other"]);
      assert.equal(element.props.priceNote, `当前模型 mystery-9（非 DeepSeek）无官方峰谷价`);
    } else {
      // Nothing resolvable: the row falls back to the official list of THIS
      // period instead of staying empty.
      assert.equal(element.props.priceNote, official(period));
      assert.ok(!label.includes("¥"), label);
      assert.ok(!label.includes("/M"), label);
      assert.match(label, /后切换$/);
    }
  }
  // The known model in the same mount still carries ITS OWN prices in the row, so
  // the checks above are about resolution and not about the row never filling.
  const known = periodElement(exports, mounted, { provider: "deepseek-official", model: "deepseek-v4-flash" });
  assert.ok(known.props.priceNote.includes("¥"));
  assert.notEqual(known.props.priceNote, official(period), "a known model names its own prices, not the list");
  assert.doesNotMatch(pillOf(known).children[0], /¥/);
});

test("the period overlay renders its price row for a known model and for none at all", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const t = mounted.t(exports.NS_PEAK);
  const period = exports.currentPeriod(new Date());
  for (const current of [{ provider: "deepseek-official", model: "deepseek-v4-flash" }, null]) {
    const element = periodElement(exports, mounted, current);
    const note = element.props.priceNote;
    assert.ok(typeof note === "string" && note.length > 0, `the period pill always states a row (${JSON.stringify(current)})`);
    const panel = exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "peak",
      tip: element.props.tip,
      priceNote: note,
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" }
    });
    // The DOM marker tooling (and the diag payload's `priceRows`) looks for.
    const row = collect(panel).find((node) => node.props["data-cost-balance-price"] !== void 0);
    assert.ok(row !== void 0, "the price row is in the overlay");
    assert.equal(row.props["data-cost-balance-price"], "peak");
    assert.equal(row.children[0], note);
    assert.equal(panel.children[panel.children.length - 1], row, "still the panel's last block");
    assert.equal((note.match(/每百万 tokens/g) ?? []).length, 1, note);
  }
  // The unknown-model row is the official list for the current period; the known
  // one is that model's own line — both carry all three numbers.
  const unknownNote = periodElement(exports, mounted, null).props.priceNote;
  assert.equal(unknownNote, exports.officialPriceNoteFor(t, period));
  const knownNote = periodElement(exports, mounted, { provider: "deepseek-official", model: "deepseek-v4-pro" }).props.priceNote;
  assert.equal(knownNote, `当前时段（${t("badge." + period)}）每百万 tokens：缓存命中 ¥${exports.formatPrice(exports.modelPrices("deepseek-v4-pro", period).cacheHitInput)} · 未命中 ¥${exports.formatPrice(exports.modelPrices("deepseek-v4-pro", period).input)} · 输出 ¥${exports.formatPrice(exports.modelPrices("deepseek-v4-pro", period).output)}`);
  assert.doesNotMatch(knownNote, /官方牌价/);
});

test("the settings card still binds the merged settings namespace", () => {
  const exports = loadBundle();
  const registrations = [];
  const writes = [];
  let boundNamespace;
  const ctx = {
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    settingsScope: {
      bind: ({ namespace }) => {
        boundNamespace = namespace;
        return {
          subscribe: () => () => {},
          getSnapshot: () => ({ value: { autoCompact: { enabled: true, contextBudget: 100000, retainTokens: 15000 } } }),
          write: (patch) => { writes.push(patch); return Promise.resolve(); }
        };
      }
    },
    slots: {
      inject: (name, callback) => callback(),
      register: (options, component) => { registrations.push({ options, component }); return () => {}; }
    }
  };
  exports.apply(ctx);
  assert.equal(boundNamespace, "cost-balance-indicator");
  const item = registrations.find((entry) => entry.options.name === "settings.plugin.item");
  assert.equal(item.options.key, "cost-balance-indicator");
  const element = item.component({ t: (key) => key, ...item.options.inject() });
  const controls = element.children[2].children;
  assert.equal(controls.length, 4);
  controls[1].props.onChange({ target: { value: "60000" } });
  assert.deepEqual(writes[0].path, ["autoCompact"]);
  assert.equal(writes[0].value.contextBudget, 60000);
});

// --------------------------------------------------------- colour overlay ----

test("hex and hsv helpers round-trip", () => {
  const exports = loadBundle();
  assert.deepEqual(exports.hexToRgb("#0f7b3d"), { r: 15, g: 123, b: 61 });
  assert.deepEqual(exports.hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
  assert.equal(exports.hexToRgb("nope"), null);
  assert.equal(exports.rgbToHex({ r: 15, g: 123, b: 61 }), "#0F7B3D");
  assert.equal(exports.rgbToHex(exports.hsvToRgb(exports.rgbToHsv({ r: 15, g: 123, b: 61 }))), "#0F7B3D");
  assert.equal(exports.rgbToHex(exports.hsvToRgb({ h: 0, s: 1, v: 1 })), "#FF0000");
  assert.equal(exports.rgbToHex(exports.hsvToRgb({ h: 120, s: 1, v: 1 })), "#00FF00");
  assert.equal(exports.rgbToHex(exports.hsvToRgb({ h: 240, s: 1, v: 1 })), "#0000FF");
});

test("the pills keep their built-in palette until a colour is set", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  assert.equal(exports.colorStore.getSnapshot().mode, "all", "the mode switch defaults to the right (all four)");
  const colors = exports.colorStore.getSnapshot().colors;
  assert.equal(colors.all.text, "");
  assert.equal(colors.peak.border, "");
  for (const key of exports.PILL_KEYS) assert.deepEqual(Object.keys(colors[key]).sort(), ["background", "border", "text"]);
  // The untouched default is the LIGHT palette, not the old price-chip green.
  assert.deepEqual({ ...exports.DEFAULT_PILL_COLORS.neutral }, { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" });
  const pills = renderFour(exports, mounted);
  assert.equal(pills.peak.props.style.color, "#0F1115");
  assert.equal(pills.turnCost.props.style.color, "#0F1115");
  assert.equal(pills.headerBalance.props.style.color, "#0F1115");
  assert.equal(pills.turnBalance.props.style.color, "#0F1115");
  assert.equal(pills.peak.props.style.background, "#F5F6F7");
  assert.equal(pills.peak.props.style.border, "1px solid #E1E5EE");
});

test("the built-in palette keeps the state signals: red at peak and below the balance threshold, grey when unreadable", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const red = { text: "#ffffff", border: "#e5484d", background: "#e5484d" };
  const grey = { text: "#667085", border: "#d0d5dd", background: "#eef0f2" };
  // A low balance (3.20 <= the 5 threshold) and a pending read: the built-in
  // palette the user sees during those states is unchanged by the light default.
  const low = renderFour(exports, mounted, {
    status: "ready",
    error: null,
    data: { ...READY_STATE.data, totalBalance: 3.2 }
  });
  for (const key of ["headerBalance", "turnBalance"]) {
    assert.equal(low[key].props.style.background, red.background, key);
    assert.equal(low[key].props.style.color, red.text, key);
  }
  // Off-peak with a healthy balance stays the light default beside it.
  assert.equal(low.peak.props.style.background, "#F5F6F7");
  const pending = renderFour(exports, mounted, { status: "idle", data: null, error: null });
  assert.equal(pending.turnBalance.props.style.background, grey.background);
  assert.equal(pending.turnBalance.props.style.color, grey.text);
  assert.deepEqual({ ...exports.DEFAULT_PILL_COLORS.muted }, grey);
  // A non-DeepSeek turn chip is neutral (light), never red.
  const other = renderFour(exports, mounted, READY_STATE);
  assert.equal(other.turnCost.props.style.background, "#F5F6F7");
});

test("a global colour recolours all four pills", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  exports.colorStore.setColor("all", "text", "#112233");
  exports.colorStore.setColor("all", "border", "#445566");
  exports.colorStore.setColor("all", "background", "#778899");
  const pills = renderFour(exports, mounted);
  for (const key of ["peak", "turnCost", "headerBalance", "turnBalance"]) {
    assert.equal(pills[key].props.style.color, "#112233", key);
    assert.equal(pills[key].props.style.border, "1px solid #445566", key);
    assert.equal(pills[key].props.style.background, "#778899", key);
  }
});

test("a single-pill colour overrides the global one for that pill only", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  exports.colorStore.setColor("all", "background", "#778899");
  exports.colorStore.setColor("turnCost", "background", "#ff0000");
  exports.colorStore.setColor("headerBalance", "text", "#00ff00");
  const pills = renderFour(exports, mounted);
  // Stored colours are normalised to upper-case hex.
  assert.equal(pills.turnCost.props.style.background, "#FF0000");
  assert.equal(pills.peak.props.style.background, "#778899");
  assert.equal(pills.turnBalance.props.style.background, "#778899");
  assert.equal(pills.headerBalance.props.style.color, "#00FF00");
  assert.equal(pills.headerBalance.props.style.background, "#778899");
  assert.equal(pills.turnBalance.props.style.color, "#0F1115", "an untouched field keeps the built-in colour");
});

test("the overlay writes to the global scope by default and to the pill in single mode", () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const mounted = mount(exports, { scope });
  const t = mounted.t(exports.NS_BALANCE);
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };

  // Default mode: "all" (the right-hand position of the switch).
  const global = exports.PillColorPanel({ t, pillKey: "turnBalance", tip: "tip", anchor: { top: 0, left: 0 }, resolved });
  const nodes = collect(global);
  const ranges = nodes.filter((node) => node.props.type === "range");
  assert.equal(ranges.length, 4, "value + R + G + B sliders");
  assert.deepEqual(ranges.map((node) => node.props.max), [100, 255, 255, 255]);
  const wheel = nodes.find((node) => typeof node.props.onPointerDown === "function");
  assert.ok(wheel !== void 0, "the RGB wheel is present");
  assert.match(wheel.props.style.backgroundImage, /conic-gradient/);
  const buttons = nodes.filter((node) => node.props.type === "button");
  const texts = buttons.map((node) => node.children[0]);
  assert.ok(texts.includes("单个") && texts.includes("整体"), "the mode switch has both positions");
  assert.ok(texts.includes("文字色") && texts.includes("边框色") && texts.includes("背景色"), "the three properties are switchable");
  // The mode switch renders 单个 first (left) and 整体 second (right); the fill
  // is one shared knob parked on the right by default, and the selected label
  // uses the skin's inverted-on-accent colour so it can never blend into it.
  assert.ok(texts.indexOf("单个") < texts.indexOf("整体"));
  const allButton = buttons.find((node) => node.children[0] === "整体");
  const singleButton = buttons.find((node) => node.children[0] === "单个");
  assert.equal(allButton.props.style.background, "transparent");
  assert.equal(singleButton.props.style.background, "transparent");
  assert.equal(allButton.props.style.color, "var(--dsw-alias-label-primary-inverted, #ffffff)");
  assert.equal(singleButton.props.style.color, "var(--dsw-alias-label-secondary, #b6bcc8)");
  const knob = nodes.find((node) => node.props["data-cost-balance-mode-knob"] !== void 0);
  assert.equal(knob.props["data-cost-balance-mode-knob"], "all", "the knob starts on the right (all four)");
  assert.equal(knob.props.style.transform, "translateX(100%)");
  assert.match(knob.props.style.transition, /transform 200ms/);
  assert.equal(knob.props.style.background, "var(--dsw-alias-brand-primary, #4f7cff)");

  // Editing the active property (text) writes the global scope.
  ranges[1].props.onChange({ target: { value: "255" } });
  exports.colorStore.flush();
  assert.equal(scope.writes.length, 1);
  assert.deepEqual(scope.writes[0].path, ["pillColors"]);
  assert.equal(scope.writes[0].value.all.text, "#FF7B3D");
  assert.equal(scope.writes[0].value.turnBalance.text, "");

  // Switching to "single" makes the same edit land on the hovered pill.
  exports.colorStore.setMode("single");
  assert.equal(exports.colorStore.getSnapshot().mode, "single");
  assert.equal(scope.writes[1].value.mode, "single");
  const perPill = exports.PillColorPanel({ t, pillKey: "turnBalance", tip: "tip", anchor: { top: 0, left: 0 }, resolved });
  const perPillRanges = collect(perPill).filter((node) => node.props.type === "range");
  perPillRanges[2].props.onChange({ target: { value: "200" } }); // G channel
  exports.colorStore.flush();
  assert.equal(scope.writes[2].value.turnBalance.text, "#0FC83D");
  assert.equal(scope.writes[2].value.headerBalance.text, "", "the other balance pill is untouched");
});

test("the overlay follows the active skin and shows the pill's own detail text", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const element = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "总余额 ¥32.65 · 更新于 14:03:21",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
  });
  const nodes = collect(element);
  assert.match(element.props.style.background, /--dsw-alias-bg-layer-3/);
  assert.match(element.props.style.color, /--dsw-alias-label-primary/);
  assert.match(element.props.style.border, /--dsw-alias-border-l2/);
  assert.equal(element.props.style.position, "fixed");
  const hint = nodes.find((node) => typeof node.children[0] === "string" && node.children[0].includes("总余额"));
  assert.ok(hint !== void 0, "the old tooltip text is still reachable inside the overlay");
  const preview = nodes.find((node) => node.children[0] === "预览");
  assert.equal(preview.props.style.color, "#0f7b3d");
  assert.equal(preview.props.style.background, "#d9f2e2");
  assert.equal(preview.props.style.border, "1px solid #7fd6a8");
});

test("the overlay reset clears the scope it edits", () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const mounted = mount(exports, { scope });
  exports.colorStore.setColor("all", "background", "#123456");
  exports.colorStore.setMode("single");
  exports.colorStore.setColor("turnBalance", "background", "#abcdef");
  assert.equal(exports.colorStore.getSnapshot().colors.turnBalance.background, "#ABCDEF");
  const element = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#ABCDEF" }
  });
  const reset = collect(element).find((node) => node.props.type === "button" && node.children[0] === "恢复浅色默认");
  assert.ok(reset !== void 0, "single mode offers a per-pill reset");
  reset.props.onClick();
  assert.equal(exports.colorStore.getSnapshot().colors.turnBalance.background, "");
  assert.equal(exports.colorStore.getSnapshot().colors.all.background, "#123456", "the global colour survives");
  // resetAll clears everything but keeps the chosen mode.
  exports.colorStore.resetAll();
  assert.equal(exports.colorStore.getSnapshot().colors.all.background, "");
  assert.equal(exports.colorStore.getSnapshot().mode, "single");
});

test("the overlay cannot overflow: sliders shrink and the wheel is a clean circle", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const element = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
  });
  const nodes = collect(element);
  // A range input keeps an intrinsic minimum width, so `min-width: 0` is what
  // stops the channel rows from pushing the numeric read-outs out of the box.
  for (const range of nodes.filter((node) => node.props.type === "range")) {
    assert.equal(range.props.style.minWidth, 0);
    assert.equal(range.props.style.flex, "1 1 auto");
  }
  assert.equal(element.props.style.boxSizing, "border-box");
  assert.equal(element.props.style.width, 340);
  // The inner column is allowed to shrink next to the fixed-size wheel.
  const rightColumn = nodes.find((node) => node.props.style.flex === "1 1 auto" && node.props.style.flexDirection === "column");
  assert.equal(rightColumn.props.style.minWidth, 0);
});

test("the wheel is forced round and clipped to its own circle", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const element = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
  });
  const nodes = collect(element);
  const wheel = nodes.find((node) => typeof node.props.onPointerDown === "function");
  const style = wheel.props.style;
  // The skin sets `corner-shape: superellipse(1.5)` on `*`, which paints every
  // `border-radius: 50%` as a squircle; the wheel's hue ring is a circle, so it
  // must opt out or the colours stop matching the shape (verified in a browser).
  assert.equal(style.cornerShape, "round");
  assert.equal(style.borderRadius, "50%");
  assert.equal(style.overflow, "hidden");
  assert.equal(style.boxSizing, "border-box");
  assert.equal(style.width, style.height);
  // Longhands only: a `background` shorthand declared after the clip would reset
  // it back to border-box and let the gradients bleed under the border.
  assert.equal(style.background, void 0, "the background shorthand must not be used");
  assert.equal(style.backgroundClip, "padding-box");
  assert.equal(style.backgroundOrigin, "padding-box");
  assert.match(style.backgroundImage, /radial-gradient\(circle closest-side/);
  assert.match(style.backgroundImage, /conic-gradient\(from 0deg/);
  assert.doesNotMatch(style.backgroundImage, /farthest-corner/);
  // The selection dot is a circle on that circle, for the same reason.
  const dot = nodes.find((node) => (node.props.style || {}).border === "2px solid #ffffff");
  assert.equal(dot.props.style.cornerShape, "round");
  assert.equal(dot.props.style.borderRadius, "50%");
  // The panel and the mode switch keep the skin's corner shape, like the pills.
  assert.equal(element.props.style.cornerShape, void 0);
});

test("every pill's overlay offers the top-up shortcut", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const anchorsFor = (pillKey) => collect(exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey,
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved
  })).filter((node) => node.type === "a");
  for (const pillKey of exports.PILL_KEYS) {
    const links = anchorsFor(pillKey);
    assert.equal(links.length, 1, `${pillKey} carries the top-up entry`);
    assert.equal(links[0].props.href, "https://platform.deepseek.com/top_up");
    assert.equal(links[0].props.target, "_blank");
    assert.equal(links[0].props.rel, "noreferrer noopener");
    assert.equal(links[0].children[0], "充值");
    // The same pill geometry as before, and one tooltip that describes the entry
    // on every pill instead of claiming to belong to the balance pill only.
    assert.equal(links[0].props.style.borderRadius, 999);
    assert.equal(links[0].props.style.textDecoration, "none");
    assert.equal(links[0].props.style.fontSize, 11);
    assert.match(links[0].props.title, /充值页/);
    assert.match(links[0].props.title, /登录页/);
    assert.match(links[0].props.title, /platform\.deepseek\.com\/top_up/);
  }
  // Both dictionaries carry the same wording, and the top-up label itself.
  assert.equal(mounted.dictionaries[exports.NS_BALANCE].en["colors.topup"], "Top up");
  assert.match(mounted.dictionaries[exports.NS_BALANCE].en["colors.topup.tip"], /sign-in page/);
  assert.match(mounted.dictionaries[exports.NS_PEAK].zh["colors.topup.tip"], /充值页/);
});

test("with no balance data the top-up entry falls back to the sign-in page", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const OFFICIAL_TOPUP = "https://platform.deepseek.com/top_up";
  const OFFICIAL_LOGIN = "https://platform.deepseek.com/sign_in";
  // Rendered on a turn pill, i.e. not the balance pill: the entry is unconditional.
  const hrefFor = (state) => {
    const original = exports.balanceStore.getSnapshot;
    exports.balanceStore.getSnapshot = () => state;
    try {
      const links = collect(exports.PillColorPanel({
        t: mounted.t(exports.NS_BALANCE),
        pillKey: "turnCost",
        tip: "tip",
        anchor: { top: 0, left: 0 },
        resolved
      })).filter((node) => node.type === "a");
      assert.equal(links.length, 1);
      return links[0].props.href;
    } finally {
      exports.balanceStore.getSnapshot = original;
    }
  };
  // A snapshot with no payload at all keeps the links the last payload left
  // behind — that is the no-key case, and there the sign-in page comes first.
  assert.equal(hrefFor({ status: "error", data: null, error: "no key", links: { topUpUrl: OFFICIAL_TOPUP, loginUrl: OFFICIAL_LOGIN } }), OFFICIAL_LOGIN);
  // Nothing known at all: the official top-up page is the last resort.
  assert.equal(hrefFor({ status: "error", data: null, error: "HTTP 401" }), OFFICIAL_TOPUP);
  assert.equal(hrefFor({ status: "idle", data: null, error: null, links: null }), OFFICIAL_TOPUP);
  // A payload that could read no balance prefers its own sign-in page…
  assert.equal(hrefFor({
    status: "error",
    data: { ok: false, error: "没有找到 DeepSeek API Key", topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" }
  }), "https://gw.example.com/sign_in");
  // …while a payload that DID read a balance keeps the endpoint's top-up page.
  assert.equal(hrefFor({
    status: "ready",
    data: { ok: true, totalBalance: 32.65, topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" }
  }), "https://gw.example.com/top_up");
});

test("a failed balance read keeps the endpoint's top-up and sign-in pages", async () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  globalThis.fetch = () => Promise.resolve({
    status: 200,
    json: () => Promise.resolve({
      ok: false,
      error: "没有找到 DeepSeek API Key",
      topUpUrl: "https://gw.example.com/top_up",
      loginUrl: "https://gw.example.com/sign_in",
      fetchedAt: 1
    })
  });
  try {
    await exports.balanceStore.refresh(true);
    const snapshot = exports.balanceStore.getSnapshot();
    assert.equal(snapshot.status, "error");
    assert.equal(snapshot.data, null, "a failed read still reports no balance");
    assert.deepEqual(snapshot.links, { topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" });
    // …and that is what makes the overlay's 充值 entry reach the sign-in page.
    const links = collect(exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "headerBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
    })).filter((node) => node.type === "a");
    assert.equal(links[0].props.href, "https://gw.example.com/sign_in");
    // A later network failure keeps them rather than blanking the entry.
    globalThis.fetch = () => Promise.reject(new Error("offline"));
    exports.balanceStore.stopPolling();
    await exports.balanceStore.refresh(true);
    assert.deepEqual(exports.balanceStore.getSnapshot().links, { topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" });
  } finally {
    delete globalThis.fetch;
  }
});

test("the overlay opens only after the pointer rests on the pill", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  // The delay is what keeps a pointer sweeping across the header or a turn row
  // from throwing the overlay open.
  assert.equal(exports.HOVER_OPEN_MS, 500);
  assert.equal(exports.HOVER_CLOSE_MS, 240);
  const timers = [];
  const cleared = [];
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  globalThis.clearTimeout = (handle) => { cleared.push(handle); };
  try {
    const balance = entryFor(mounted.registrations, TURN, "cost-balance-indicator-balance");
    const element = render(balance, mounted);
    // The hover handlers live on the wrapper around the pill.
    const host = expand(element);
    // Nothing is open before the pointer arrives, and entering only schedules.
    // (The wrapper always carries two children; the second is the overlay slot.)
    assert.equal(host.children[1] ?? null, null, "no overlay before hover");
    host.props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ bottom: 10, left: 20 }) } });
    assert.equal(timers.length, 1);
    assert.equal(timers[0].ms, 500, "the overlay opens 0.5s after the pointer rests");
    assert.equal(host.children[1] ?? null, null, "the overlay is not open yet");
    // Leaving before the delay cancels the pending open.
    host.props.onMouseLeave();
    assert.ok(cleared.includes(1), "leaving cancels the pending open");
    assert.equal(timers[timers.length - 1].ms, exports.HOVER_CLOSE_MS);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("the overlay offers exactly the dark and light presets, and light is the default", () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const mounted = mount(exports, { scope });
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const renderPanel = () => exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved
  });
  const presetsOf = (element) => collect(element).filter((node) => node.props["data-cost-balance-preset"] !== void 0);
  const buttons = presetsOf(renderPanel());
  // There is no 「默认」 preset any more: the built-in palette IS the light one.
  assert.deepEqual(buttons.map((node) => node.props["data-cost-balance-preset"]), ["dark", "light"]);
  assert.deepEqual(buttons.map((node) => node.children[0]), ["深色", "浅白"]);
  assert.equal(exports.PILL_PRESETS.length, 2);
  // With nothing customised the highlight sits on 浅白, and only on it.
  assert.equal(buttons[1].props["aria-pressed"], true, "the light preset is the active one by default");
  assert.equal(buttons[0].props["aria-pressed"], false);
  assert.equal(exports.colorStore.activePreset("all"), "light");
  // No dictionary string advertises a preset that no longer exists, in either
  // language, and the tooltips name the app's own theme rather than a skin.
  for (const key of ["colors.preset.default", "colors.preset.default.tip"]) {
    assert.equal(exports.zh[key], void 0, `zh/${key} must be gone`);
    assert.equal(exports.en[key], void 0, `en/${key} must be gone`);
  }
  for (const dict of [exports.zh, exports.en]) {
    assert.equal(dict["colors.priceUnit"], void 0, "the period pill no longer prints prices on its face");
  }
  assert.match(buttons[0].props.title, /DSH/);
  assert.match(buttons[0].props.title, /#2C2C2E/);
  assert.match(buttons[1].props.title, /DSH/);
  assert.match(buttons[1].props.title, /#F5F6F7/);

  // The two presets are exactly the DSH desktop app's own surfaces
  // (--dsw-alias-label-primary / --dsw-alias-bg-layer-2 for dark, ...-bg-module-platform
  // and --dsw-static-neutral-bluish-800 for the light background and both borders),
  // and the light one is the built-in palette hex for hex.
  assert.deepEqual({ ...exports.PILL_PRESETS[0].colors }, { text: "#F9FAFB", border: "#353638", background: "#2C2C2E" });
  assert.deepEqual({ ...exports.PILL_PRESETS[1].colors }, { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" });
  assert.deepEqual({ ...exports.PILL_PRESETS[1].colors }, { ...exports.DEFAULT_PILL_COLORS.neutral });

  // Applying one writes the whole scope and moves the highlight.
  buttons[0].props.onClick();
  const written = scope.writes[scope.writes.length - 1].value;
  assert.equal(written.all.background, "#2C2C2E");
  assert.equal(written.all.text, "#F9FAFB");
  assert.equal(written.all.border, "#353638");
  const after = presetsOf(renderPanel());
  assert.equal(after[0].props["aria-pressed"], true, "the dark preset becomes active");
  assert.equal(after[1].props["aria-pressed"], false);
  // …and the pills really take the preset colours.
  const pills = renderFour(exports, mounted);
  assert.equal(pills.turnBalance.props.style.background, "#2C2C2E");
  assert.equal(pills.turnCost.props.style.color, "#F9FAFB");
  assert.equal(pills.headerBalance.props.style.border, "1px solid #353638");

  // 浅白 puts the light hexes in the scope, and is then the active preset.
  after[1].props.onClick();
  assert.equal(exports.colorStore.activePreset("all"), "light");
  assert.equal(scope.writes[scope.writes.length - 1].value.all.background, "#F5F6F7");
  assert.equal(renderFour(exports, mounted).turnBalance.props.style.background, "#F5F6F7");
});

test("a wheel edit clears the preset highlight, and clearing the scope brings the light one back", () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const mounted = mount(exports, { scope });
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const renderPanel = () => exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved
  });
  const pressed = () => collect(renderPanel())
    .filter((node) => node.props["data-cost-balance-preset"] !== void 0)
    .map((node) => [node.props["data-cost-balance-preset"], node.props["aria-pressed"]]);
  assert.deepEqual(pressed(), [["dark", false], ["light", true]]);
  // A custom colour matches no preset, so nothing is highlighted…
  exports.colorStore.setColor("all", "text", "#112233");
  assert.equal(exports.colorStore.activePreset("all"), null);
  assert.deepEqual(pressed(), [["dark", false], ["light", false]]);
  // …and the reset button clears the scope, which is the built-in light palette.
  const reset = collect(renderPanel()).find((node) => node.props.type === "button" && node.children[0] === "全部恢复浅色默认");
  assert.ok(reset !== void 0, "the all-scope reset says what it restores");
  reset.props.onClick();
  assert.equal(exports.colorStore.activePreset("all"), "light");
  assert.deepEqual(pressed(), [["dark", false], ["light", true]]);
});

test("a preset follows the mode switch: all four, or only the hovered pill", () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const mounted = mount(exports, { scope });
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const renderPanel = () => exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved
  });
  collect(renderPanel()).find((node) => node.props["data-cost-balance-preset"] === "light").props.onClick();
  assert.equal(scope.writes[scope.writes.length - 1].value.all.background, "#F5F6F7");
  // Switch to "single" and the same preset lands on the hovered pill only.
  exports.colorStore.setMode("single");
  collect(renderPanel()).find((node) => node.props["data-cost-balance-preset"] === "dark").props.onClick();
  const colors = exports.colorStore.getSnapshot().colors;
  assert.equal(colors.turnBalance.background, "#2C2C2E");
  assert.equal(colors.all.background, "#F5F6F7", "the global preset is untouched");
  assert.equal(exports.colorStore.activePreset("turnBalance"), "dark");
});

// ------------------------------------------- the overlay's price row ---------

test("the price row is the overlay's LAST block, below the tip", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const note = "当前时段（闲时）每百万 tokens：缓存命中 ¥0.02 · 未命中 ¥1 · 输出 ¥4";
  const element = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "peak",
    tip: "tooltip detail",
    priceNote: note,
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" }
  });
  const priceRow = collect(element).find((node) => node.props["data-cost-balance-price"] !== void 0);
  assert.ok(priceRow !== void 0, "the panel carries the price row");
  assert.equal(priceRow.props["data-cost-balance-price"], "peak");
  assert.equal(priceRow.children[0], note);
  // A separate block at the very bottom: the panel's last child, with its own
  // top border like the tip line above it.
  const last = element.children[element.children.length - 1];
  assert.equal(last, priceRow, "the price row is the panel's last row");
  assert.equal(priceRow.props.style.borderTop, "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))");
  assert.equal(priceRow.props.style.paddingTop, 6);
  assert.equal(priceRow.props.style.marginTop, 6);
  // The tip keeps its own block above it.
  const tipRow = collect(element).find((node) => node.children[0] === "tooltip detail");
  assert.ok(tipRow !== void 0);
  assert.equal(tipRow.props.style.borderTop, priceRow.props.style.borderTop);
  assert.ok(element.children.indexOf(tipRow) < element.children.indexOf(priceRow));
});

test("pills that pass no price note keep the panel exactly as it was", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const panelFor = (extra) => exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "总余额 ¥32.65 · 更新时间 14:03:21",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" },
    ...extra
  });
  for (const element of [panelFor({}), panelFor({ priceNote: "" }), panelFor({ priceNote: null })]) {
    const nodes = collect(element);
    assert.equal(nodes.find((node) => node.props["data-cost-balance-price"] !== void 0), void 0);
    // The tip line is still the panel's LAST rendered block: with no note, the
    // only rows after it are the conditional slots that render nothing.
    const rows = element.children.flat().filter((child) => child !== null && child !== void 0);
    assert.deepEqual(rows[rows.length - 1].children, ["总余额 ¥32.65 · 更新时间 14:03:21"]);
  }
  // A balance pill's overlay really carries no price row, through the same
  // ColorablePill path the app uses: the component resolves the balance hexes and
  // is handed no note, so the price row never appears.
  const balanceEntry = entryFor(mounted.registrations, TURN, "cost-balance-indicator-balance");
  const balanceElement = render(balanceEntry, mounted);
  assert.equal(balanceElement.props.priceNote, void 0, "the balance pill passes no price note");
  const panel = exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: balanceElement.props.pillKey,
    tip: balanceElement.props.tip,
    priceNote: balanceElement.props.priceNote,
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" }
  });
  const nodes = collect(panel);
  assert.equal(nodes.find((node) => node.props["data-cost-balance-price"] !== void 0), void 0);
  assert.ok(nodes.some((node) => typeof node.children[0] === "string" && node.children[0].includes("余额")));
});

test("the per-turn chip hands its own period's price row to the overlay", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const zh = mounted.dictionaries[exports.NS_PEAK].zh;
  const turn = entryFor(mounted.registrations, TURN, "cost-balance-indicator-turn");
  const element = render(turn, mounted, { messageId: "m1", useProjection: () => PROJECTION });
  // The fixture's turn was billed off-peak, so the row names 闲时 whatever the
  // clock says right now, and carries that period's flash prices.
  const offpeak = exports.modelPrices("deepseek-v4-flash", "offpeak");
  assert.equal(
    element.props.priceNote,
    `当前时段（${zh["badge.offpeak"]}）每百万 tokens：缓存命中 ¥${exports.formatPrice(offpeak.cacheHitInput)} · 未命中 ¥${exports.formatPrice(offpeak.input)} · 输出 ¥${exports.formatPrice(offpeak.output)}`
  );
  // The chip's own label is the turn cost, and the price is NOT on it.
  assert.equal(element.children[0], "本轮 ¥0.08");
  assert.ok(!element.children[0].includes("每百万 tokens"));
  // A non-DeepSeek turn states the model and says it has no peak/off-peak price.
  const otherProjection = {
    totalCost: 0.5,
    messageCosts: { m2: { provider: "some-gateway", model: "gpt-4o", turn: 1, period: "offpeak", cost: 0.5 } }
  };
  const other = render(turn, mounted, { messageId: "m2", useProjection: () => otherProjection });
  assert.equal(other.props.priceNote, "当前模型 gpt-4o（非 DeepSeek）无官方峰谷价");
  assert.equal(other.props.builtIn.background, "#F5F6F7", "a non-DeepSeek turn is never red");
});

/** A stand-in for the browser's own storage. */
function fakeStorage() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); }
  };
}

const STORAGE_KEY = "dsh-cost-balance-indicator.pillColors";

test("the off-peak badge uses the sleep mark", () => {
  const exports = loadBundle();
  const { dictionaries } = mount(exports);
  assert.equal(dictionaries[exports.NS_PEAK].zh["badge.offpeak"], "💤 闲时");
  assert.equal(dictionaries[exports.NS_PEAK].en["badge.offpeak"], "💤 Off-peak");
});

test("the save button writes the palette right away and confirms it", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const scope = fakeScope();
    const mounted = mount(exports, { scope });
    const renderPanel = () => exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
    });
    exports.colorStore.setColor("all", "background", "#123456");
    assert.equal(storage.map.size, 1, "every edit also lands in browser storage");
    const save = collect(renderPanel()).find((node) => node.props["data-cost-balance-save"] === "now");
    assert.ok(save !== void 0, "the overlay offers an explicit save");
    assert.equal(save.children[0], "保存");
    await save.props.onClick();
    assert.equal(scope.writes.length, 1, "save writes immediately instead of waiting for the debounce");
    assert.equal(scope.writes[0].value.all.background, "#123456");
    assert.deepEqual(scope.writes[0].path, ["pillColors"]);
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(storage.map.size, 0, "a successful host write drops the browser copy");
    const status = collect(renderPanel()).find((node) => node.props["data-cost-balance-save-status"] !== void 0);
    assert.equal(status.props["data-cost-balance-save-status"], "saved");
    assert.equal(status.children[0], "已保存");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a refused write keeps the palette in browser storage and reports it", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const scope = fakeScope();
    scope.set = () => Promise.reject(new Error("host refused the section"));
    const mounted = mount(exports, { scope });
    exports.colorStore.setColor("all", "text", "#FF0000");
    await exports.colorStore.saveNow();
    const save = exports.colorStore.getSnapshot().save;
    assert.equal(save.status, "error");
    assert.match(save.message, /host refused/);
    assert.equal(storage.map.size, 1, "the browser copy survives a refusal");
    const element = exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
    });
    const status = collect(element).find((node) => node.props["data-cost-balance-save-status"] !== void 0);
    assert.equal(status.props["data-cost-balance-save-status"], "error");
    assert.match(status.children[0], /保存失败：host refused/);
  } finally {
    delete globalThis.localStorage;
  }
});

test("reloading the page restores a palette the host never accepted", () => {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const refusingScope = () => {
      const fake = fakeScope();
      fake.set = () => Promise.reject(new Error("stale host schema"));
      return fake;
    };
    // First visit: the edit only makes it into browser storage.
    const first = loadBundle();
    mount(first, { scope: refusingScope() });
    first.colorStore.setColor("all", "background", "#414559");
    assert.equal(first.colorStore.getSnapshot().colors.all.background, "#414559");
    assert.ok(storage.map.has(STORAGE_KEY));
    // Second visit: a fresh bundle, the same browser storage, an empty section.
    const second = loadBundle();
    const mounted = mount(second, { scope: fakeScope() });
    assert.equal(second.colorStore.getSnapshot().colors.all.background, "#414559", "the palette survives the reload");
    assert.equal(second.colorStore.getSnapshot().save.status, "local");
    assert.equal(renderFour(second, mounted).turnBalance.props.style.background, "#414559");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a stored palette outranks the browser copy", () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ mode: "all", all: { text: "", border: "", background: "#111111" } }));
    const scope = fakeScope({ pillColors: { mode: "all", all: { text: "", border: "", background: "#222222" } } });
    mount(exports, { scope });
    assert.equal(exports.colorStore.getSnapshot().colors.all.background, "#222222");
    assert.equal(storage.map.size, 0, "the settings document wins and the stale browser copy is dropped");
  } finally {
    delete globalThis.localStorage;
  }
});

test("resetting to the default preset forgets the browser copy too", () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const scope = fakeScope();
    mount(exports, { scope });
    exports.colorStore.setColor("all", "background", "#123456");
    assert.ok(storage.map.has(STORAGE_KEY));
    exports.colorStore.resetAll();
    assert.equal(storage.map.has(STORAGE_KEY), false, "nothing custom is left to restore");
    assert.equal(exports.colorStore.getSnapshot().colors.all.background, "");
  } finally {
    delete globalThis.localStorage;
  }
});

test("the save path follows the client's own scope API", async () => {
  // `set(field, value)` is the documented API and must be preferred.
  const modern = loadBundle();
  globalThis.localStorage = fakeStorage();
  try {
    const scope = fakeScope();
    mount(modern, { scope });
    modern.colorStore.setColor("all", "text", "#FF0000");
    await modern.colorStore.saveNow();
    assert.equal(scope.writes.length, 1);
    assert.deepEqual(scope.writes[0].path, ["pillColors"]);
    assert.equal(modern.colorStore.getSnapshot().save.status, "saved");
  } finally {
    delete globalThis.localStorage;
  }
  // An atomic-only client still works through `mutate(ops)`.
  const atomic = loadBundle();
  globalThis.localStorage = fakeStorage();
  try {
    const scope = fakeScope({}, { api: "mutate" });
    mount(atomic, { scope });
    atomic.colorStore.setColor("all", "text", "#00FF00");
    await atomic.colorStore.saveNow();
    assert.equal(scope.writes.length, 1);
    assert.equal(scope.writes[0].value.all.text, "#00FF00");
  } finally {
    delete globalThis.localStorage;
  }
  // A connection that keeps preferences process-local never accepts writes.
  const memory = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const scope = fakeScope({}, { writable: false });
    mount(memory, { scope });
    memory.colorStore.setColor("all", "text", "#0000FF");
    await memory.colorStore.saveNow();
    assert.equal(scope.writes.length, 0, "no write is attempted when the host is not writable");
    assert.equal(memory.colorStore.getSnapshot().save.status, "local");
    assert.ok(storage.map.has(STORAGE_KEY), "the browser copy carries the palette");
  } finally {
    delete globalThis.localStorage;
  }
});

/** A client whose only settings surface is the `remote.settings` RPC, like the desktop app. */
function remoteOnlyCtx(document = {}, options = {}) {
  const registrations = [];
  const mutations = [];
  const updates = [];
  const replaces = [];
  const state = { revision: options.revision ?? 7, section: document };
  /** The rejection list for one method, or null when it accepts this call. */
  const refusalFor = (method, count) => {
    if (options.conflictOnce === true && method === "mutate" && count === 1) {
      // The real provider bumps the revision when it refuses a stale write, so
      // the re-read that follows a conflict sees the NEW revision.
      const actual = state.revision + 1;
      const refusal = { code: "settings/conflict", message: "stale revision", details: { ns: "cost-balance-indicator", expected: state.revision, actual } };
      state.revision = actual;
      return refusal;
    }
    const list = options.refuseMethods?.[method];
    if (Array.isArray(list)) {
      const spec = list[Math.min(count - 1, list.length - 1)];
      return spec === void 0 || spec === false ? null : spec;
    }
    return options.refuse === true ? { code: "settings/rejected", message: "read-only provider" } : null;
  };
  /** One accepted write: the new section plus a bumped revision. */
  const accepted = (ns) => ({ ok: true, value: { ns, value: state.section, revision: state.revision } });
  const service = {
    describe: () => Promise.resolve({
      ok: true,
      value: {
        writable: true,
        hasDocument: true,
        namespaces: [{
          ns: "cost-balance-indicator",
          applies: options.applies ?? "live",
          value: state.section,
          revision: state.revision
        }]
      }
    }),
    mutate: (ns, ops, revision) => {
      mutations.push({ ns, ops, revision });
      const refusal = refusalFor("mutate", mutations.length);
      if (refusal !== null) return Promise.resolve({ ok: false, error: { ...refusal } });
      for (const op of ops) state.section = { ...state.section, [op.path[0]]: op.value };
      state.revision += 1;
      return Promise.resolve(accepted(ns));
    },
    update: (ns, patch, revision) => {
      updates.push({ ns, patch, revision });
      const refusal = refusalFor("update", updates.length);
      if (refusal !== null) return Promise.resolve({ ok: false, error: { ...refusal } });
      state.section = { ...state.section, ...patch };
      state.revision += 1;
      return Promise.resolve(accepted(ns));
    },
    replace: (ns, section, revision) => {
      replaces.push({ ns, section, revision });
      const refusal = refusalFor("replace", replaces.length);
      if (refusal !== null) return Promise.resolve({ ok: false, error: { ...refusal } });
      state.section = { ...section };
      state.revision += 1;
      return Promise.resolve(accepted(ns));
    }
  };
  if (options.methods !== void 0) {
    for (const name of ["mutate", "update", "replace"]) {
      if (options.methods.includes(name) === false) delete service[name];
    }
  }
  const ctx = {
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    logger: { warn: () => {} },
    slots: {
      inject: (name, callback) => callback(),
      register: (options2, component) => { registrations.push({ options: options2, component }); return () => {}; }
    },
    remote: { settings: service }
  };
  // `get` is the client's own service lookup: this one knows the settings service
  // and nothing else.
  if (options.facilities?.get === true) ctx.get = (name) => (name === "remote.settings" ? service : void 0);
  // `ctx.inject(...)` is present but the namespaced property read still throws,
  // exactly like Cordis's injection guard.
  if (options.facilities?.inject === true) {
    ctx.inject = (deps, callback) => {
      callback({ remote: { settings: service } });
    };
  }
  return { ctx, registrations, mutations, updates, replaces, state, service };
}

/**
 * The client that made the desktop app report "已存本机": the namespaced property
 * read throws (`cannot get property "remote.settings" without inject`) until the
 * service has been injected, and that injection only completes after `availableMs`
 * — i.e. long after the mount has finished. `facility` decides which path can
 * eventually win: `"get"` leaves only the service lookup, `"inject"` only the
 * injection, and neither is available while the property read throws.
 */
function lateSettingsCtx({ availableMs = 120, facility = "get", refuse = false } = {}) {
  const built = remoteOnlyCtx({}, { refuse });
  const { ctx, service } = built;
  let ready = false;
  setTimeout(() => { ready = true; }, availableMs);
  const reachable = () => ready;
  Object.defineProperty(ctx, "get", {
    configurable: true,
    value: (name) => (facility === "get" && reachable() && name === "remote.settings" ? service : void 0)
  });
  Object.defineProperty(ctx, "inject", {
    configurable: true,
    value: (deps, callback) => {
      // `whenReady` drives the framework's own readiness (`locale`, `slots`)
      // through this same facility, so those always land; only the settings
      // service is late.
      if (Array.isArray(deps) && deps.includes("remote.settings")) {
        if (facility === "inject" && reachable()) callback({ remote: { settings: service } });
        return;
      }
      callback(ctx);
    }
  });
  Object.defineProperty(ctx, "remote", {
    configurable: true,
    get() {
      throw new Error('cannot get property "remote.settings" without inject');
    }
  });
  return built;
}

const DARK_PALETTE = {
  mode: "all",
  all: { text: "#C6D0F5", border: "#626880", background: "#414559" }
};

test("the desktop's settings RPC persists colours when there is no scope binder", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    // Exactly the desktop shape: no settingsScope service, only remote.settings.
    const { ctx, mutations, state } = remoteOnlyCtx({ pillColors: DARK_PALETTE });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Read path: the document's palette is adopted on load.
    assert.equal(exports.colorStore.getSnapshot().colors.all.background, "#414559");
    // Write path: an edit goes through mutate(ns, ops, revision).
    exports.colorStore.setColor("all", "background", "#123456");
    await exports.colorStore.saveNow();
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0].ns, "cost-balance-indicator");
    assert.deepEqual(mutations[0].ops, [{ op: "set", path: ["pillColors"], value: state.section.pillColors }]);
    assert.equal(mutations[0].revision, 7, "the revision read from describe fences the write");
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(state.section.pillColors.all.background, "#123456");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a refused settings write is reported, not swallowed", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx } = remoteOnlyCtx({ pillColors: DARK_PALETTE }, { refuse: true });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    exports.colorStore.setColor("all", "text", "#FF0000");
    await exports.colorStore.saveNow();
    const save = exports.colorStore.getSnapshot().save;
    assert.equal(save.status, "error");
    assert.match(save.message, /settings\/rejected: read-only provider/);
    assert.ok(storage.map.has(STORAGE_KEY), "the browser copy keeps the palette meanwhile");
  } finally {
    delete globalThis.localStorage;
  }
});

// --- the desktop app's write path: refused method -> the next one ------------

/**
 * The refusal a newer bundled core answers with when its controller cannot find
 * a volatile field on the plugin's Config schema. All three write methods run
 * through that ONE check, so every one of them answers this identically.
 */
const NO_VOLATILE = {
  code: "settings/rejected",
  message: 'Plugin entry "cost-balance-indicator" has no volatile fields'
};

test("a refused mutate falls back to update, and the write lands", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx, mutations, updates, state } = remoteOnlyCtx({ pillColors: DARK_PALETTE }, { refuseMethods: { mutate: [NO_VOLATILE] } });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    exports.colorStore.setColor("all", "background", "#123456");
    await exports.colorStore.saveNow();
    assert.equal(mutations.length, 1, "mutate was tried first");
    assert.equal(updates.length, 1, "and update carried the write");
    assert.equal(state.section.pillColors.all.background, "#123456", "the section really changed");
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(storage.map.size, 0, "the host copy is now the source of truth");
    // The report names the method that worked and keeps the refusal raw.
    const report = exports.diagState("test");
    assert.equal(report.colorWriteMethod, "update");
    assert.deepEqual(report.colorWriteAttempts.map((attempt) => [attempt.method, attempt.accepted]), [["mutate", false], ["update", true]]);
    assert.equal(report.colorWriteAttempts[0].code, "settings/rejected");
    assert.equal(report.colorWriteAttempts[0].message, NO_VOLATILE.message);
    assert.equal(report.colorWriteAttempts[0].revision, 7);
  } finally {
    delete globalThis.localStorage;
  }
});

test("mutate and update both refused falls through to replace", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx, mutations, updates, replaces } = remoteOnlyCtx(
      { pillColors: DARK_PALETTE },
      { refuseMethods: { mutate: [NO_VOLATILE], update: [NO_VOLATILE] } }
    );
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    exports.colorStore.setColor("all", "text", "#FF0000");
    await exports.colorStore.saveNow();
    assert.equal(mutations.length, 1);
    assert.equal(updates.length, 1);
    assert.equal(replaces.length, 1, "replace is the last resort");
    // `replace` restates the section, so it must carry the CURRENT section plus
    // the edited field — never the field alone, which would drop the rest. The
    // current section is the store's own normalised palette, so every pill key
    // is present with the stored value or an empty "use the built-in colour".
    assert.equal(replaces[0].ns, "cost-balance-indicator");
    const expectedPillColors = exports.normalizeColorSettings({ ...DARK_PALETTE, all: { ...DARK_PALETTE.all, text: "#FF0000" } });
    assert.deepEqual(replaces[0].section.pillColors, { ...expectedPillColors });
    assert.equal(replaces[0].revision, 7);
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(exports.diagState("test").colorWriteMethod, "replace");
  } finally {
    delete globalThis.localStorage;
  }
});

test("all three methods refused: the host's own message surfaces and the browser copy stays", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx, mutations, updates, replaces } = remoteOnlyCtx(
      { pillColors: DARK_PALETTE },
      { refuseMethods: { mutate: [NO_VOLATILE], update: [NO_VOLATILE], replace: [NO_VOLATILE] } }
    );
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    exports.colorStore.setColor("all", "background", "#ABCDEF");
    await exports.colorStore.saveNow();
    assert.equal(mutations.length + updates.length + replaces.length, 3, "every method was tried exactly once");
    const save = exports.colorStore.getSnapshot().save;
    assert.equal(save.status, "error");
    // The desktop's exact error text, verbatim, is what the overlay shows.
    assert.equal(save.message, `${NO_VOLATILE.code}: ${NO_VOLATILE.message}`);
    assert.equal(storage.map.size, 1, "the palette survives in browser storage");
    assert.equal(JSON.parse(storage.map.get(STORAGE_KEY)).all.background, "#ABCDEF");
    // The report keeps every refusal, in order, with its raw code and message.
    const report = exports.diagState("test");
    assert.equal(report.colorWriteMethod, "none");
    assert.deepEqual(report.colorWriteAttempts.map((attempt) => attempt.method), ["mutate", "update", "replace"]);
    assert.deepEqual(report.colorWriteAttempts.map((attempt) => attempt.accepted), [false, false, false]);
    for (const attempt of report.colorWriteAttempts) assert.equal(attempt.message, NO_VOLATILE.message);
  } finally {
    delete globalThis.localStorage;
  }
});

test("a method this client does not offer is skipped, not fatal", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    // An RPC with describe + replace only: no `mutate`, no `update`.
    const { ctx, replaces } = remoteOnlyCtx({ pillColors: DARK_PALETTE }, { methods: ["replace"] });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(exports.diagState("test").colorBackendBound, true, "a write method other than mutate still binds");
    exports.colorStore.setColor("all", "border", "#00FF00");
    await exports.colorStore.saveNow();
    assert.equal(replaces.length, 1);
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(exports.diagState("test").colorWriteMethod, "replace");
  } finally {
    delete globalThis.localStorage;
  }
});

test("the report carries the host's own view of the namespace", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx } = remoteOnlyCtx({ pillColors: DARK_PALETTE }, { applies: "restart" });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const report = exports.diagState("test");
    // Keys and small scalars only: `applies`, `revision` and the KEY NAMES of the
    // entry and of its value. The values themselves never ride.
    assert.equal(report.colorNamespace.ns, "cost-balance-indicator");
    assert.equal(report.colorNamespace.found, true);
    assert.equal(report.colorNamespace.applies, "restart");
    assert.equal(report.colorNamespace.revision, 7);
    assert.deepEqual(report.colorNamespace.entryKeys, ["ns", "applies", "value", "revision"]);
    assert.deepEqual(report.colorNamespace.valueKeys, ["pillColors"]);
    // The report names its own build, so a served bundle can be told apart from
    // the previous one without guessing from timestamps.
    assert.equal(report.colorWriteBuild, "cbi-write-chain-0.8.1+mutate-update-replace");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a namespace the host does not advertise says so instead of guessing", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    // `describe()` answers for the WRITE itself, with no entry for this plugin:
    // that is the state a namespace-less core is in, and it must not be reported
    // as a bound, writable backend with a silent write path.
    const service = {
      describe: () => Promise.resolve({ ok: true, value: { writable: true, hasDocument: true, namespaces: [] } }),
      mutate: () => { throw new Error("must not be called"); }
    };
    const ctx = {
      effect: (callback) => { callback(); return () => {}; },
      locale: { register: () => () => {} },
      logger: { warn: () => {} },
      slots: { inject: (name, callback) => callback(), register: () => () => {} },
      remote: { settings: service }
    };
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const report = exports.diagState("test");
    assert.equal(report.colorNamespace.found, false);
    assert.equal(report.colorNamespace.ns, "cost-balance-indicator");
    assert.deepEqual(report.colorWriteAttempts, []);
    assert.equal(report.colorWriteMethod, "none");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a stale revision re-reads and retries once", async () => {
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx, mutations } = remoteOnlyCtx({ pillColors: DARK_PALETTE }, { conflictOnce: true });
    exports.apply(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    exports.colorStore.setColor("all", "background", "#abcdef");
    await exports.colorStore.saveNow();
    assert.equal(mutations.length, 2, "one refused attempt, then one retry");
    assert.equal(mutations[0].revision, 7);
    assert.equal(mutations[1].revision, 8, "the retry carries the refreshed revision");
    assert.equal(exports.colorStore.getSnapshot().save.status, "saved");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a bound scope is preferred over the settings RPC", async () => {
  const exports = loadBundle();
  const scope = fakeScope();
  const registered = [];
  exports.apply({
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    slots: { inject: (name, callback) => callback(), register: (options, component) => { registered.push(options); return () => {}; } },
    settingsScope: { bind: (spec) => { assert.equal(spec.namespace, "cost-balance-indicator"); return scope; } },
    remote: { settings: { describe: () => { throw new Error("must not be used"); }, mutate: () => { throw new Error("must not be used"); } } }
  });
  exports.colorStore.setColor("all", "background", "#0f0f0f");
  await exports.colorStore.saveNow();
  assert.equal(scope.writes.length, 1, "the binder handled the write");
  // The report says which backend won, so `local` can never be mistaken for "no
  // backend exists in this shell".
  const report = exports.diagState("test");
  assert.equal(report.colorBackendBound, true);
  assert.equal(report.colorBackendKind, "scope-binder");
  assert.equal(report.colorSaveStatus, "saved");
  assert.equal(report.colorRpcAttempts, 0, "the RPC path is not even tried when a binder exists");
});

test("a namespaced service that refuses uninjected reads never aborts the mount", () => {
  // The desktop app's exact failure: `remote.settings` is namespaced, so Cordis
  // throws `cannot get property "remote.settings" without inject` when the RPC
  // backend is built off the plain plugin context. That throw escaped the mount and
  // left the app with ZERO registered pills — and no error dialog, because the
  // client entry itself activated fine.
  const exports = loadBundle();
  const registrations = [];
  const warnings = [];
  const ctx = {
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    logger: { warn: (message) => warnings.push(message) },
    slots: {
      inject: (name, callback) => callback(),
      register: (options, component) => { registrations.push(options); return () => {}; }
    },
    get remote() {
      throw new Error('cannot get property "remote.settings" without inject');
    }
  };
  exports.apply(ctx);
  assert.deepEqual(registrations.map((options) => options.id).sort(), [
    "cost-balance-indicator-balance",
    "cost-balance-indicator-header",
    "cost-balance-indicator-peak",
    "cost-balance-indicator-turn"
  ], "the four pills still mount");
  // The guard recorded the throw instead of swallowing it, and the report states
  // that no backend bound — the observable half of the 0.8.1 bug.
  const report = exports.diagState("test");
  assert.ok(report.warnings.some((line) => /cannot get property "remote\.settings" without inject/.test(line)), JSON.stringify(report.warnings));
  assert.equal(report.colorBackendBound, false);
  assert.equal(report.colorBackendKind, "none");
  assert.equal(report.colorRpcAttempts, 1, "the guarded property read was tried once");
  assert.equal(report.colorRpcNulls, 1);
});

test("a namespaced service that throws until it is injected still binds via the retry", async () => {
  // The desktop app's real shape: the namespaced property read throws until the
  // service is reachable, and that only happens after the mount has finished. One
  // attempt is therefore never enough — the resolution has to retry, and the store
  // has to end up bound to the RPC backend instead of reporting "已存本机".
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx, mutations, state } = lateSettingsCtx({ availableMs: 120, facility: "get" });
    exports.apply(ctx);
    // The mount itself is over and the service is not reachable yet: that is
    // exactly the state the app was stuck in.
    const atMount = exports.diagState("test");
    assert.equal(atMount.colorBackendBound, false);
    assert.equal(atMount.colorRpcAttempts, 1, "the first attempt happens during the mount");
    assert.equal(atMount.colorRpcNulls, 1);
    assert.ok(atMount.warnings.some((line) => /without inject/.test(line)), JSON.stringify(atMount.warnings));

    // The retry finds it, without any further help.
    await new Promise((resolve) => setTimeout(resolve, 450));
    const bound = exports.diagState("test");
    assert.equal(bound.colorBackendBound, true, "the retry bound a backend");
    assert.equal(bound.colorBackendKind, "remote-rpc");
    assert.equal(bound.colorBackendResolvedVia, 'ctx.get("remote.settings")');
    assert.equal(bound.colorBackendWritable, true);
    assert.ok(bound.colorRpcAttempts >= 2, `more than one attempt was made (${bound.colorRpcAttempts})`);

    // …and an edit really persists through the RPC, i.e. the overlay's status
    // reaches `saved` instead of the desktop's "kept on this computer only".
    exports.colorStore.setColor("all", "background", "#123456");
    await exports.colorStore.saveNow();
    const saved = exports.diagState("test");
    assert.equal(saved.colorSaveStatus, "saved");
    assert.equal(saved.colorSaveMessage, "");
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0].ns, "cost-balance-indicator");
    assert.equal(state.section.pillColors.all.background, "#123456");
    assert.equal(storage.map.size, 0, "a successful RPC write drops the browser copy");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a late injection binds the RPC backend without a service lookup", async () => {
  // The same context, but `ctx.get` is silent forever: only `ctx.inject` can
  // reach the service, so that is the path the report must name.
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const { ctx } = lateSettingsCtx({ availableMs: 150, facility: "inject" });
    exports.apply(ctx);
    assert.equal(exports.diagState("test").colorBackendBound, false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const bound = exports.diagState("test");
    assert.equal(bound.colorBackendBound, true);
    assert.equal(bound.colorBackendKind, "remote-rpc");
    assert.equal(bound.colorBackendResolvedVia, "inject(remote.settings)");
    exports.colorStore.setColor("all", "text", "#00FF00");
    await exports.colorStore.saveNow();
    assert.equal(exports.diagState("test").colorSaveStatus, "saved");
  } finally {
    delete globalThis.localStorage;
  }
});

test("a client with neither a binder nor a settings RPC keeps the palette locally", async () => {
  // Neither facility at all — no scope binder, no `remote.settings` and no way to
  // reach one. The palette must still survive as the browser copy, and the report
  // must say why, so the desktop status line can be believed.
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  try {
    const registrations = [];
    exports.apply({
      effect: (callback) => { callback(); return () => {}; },
      locale: { register: () => () => {} },
      logger: { warn: () => {} },
      slots: { inject: (name, callback) => callback(), register: (options) => { registrations.push(options); return () => {}; } }
    });
    assert.equal(registrations.filter((options) => /header|turn|balance|peak/.test(options.id)).length, 4);
    const bound = exports.diagState("test");
    assert.equal(bound.colorBackendBound, false);
    assert.equal(bound.colorBackendKind, "none");
    assert.equal(bound.colorBackendResolvedVia, "none");
    assert.equal(bound.colorBackendWritable, false);
    // The resolution was attempted once — and, with no facility left to consult,
    // gave up instead of scheduling a retry it could not make.
    assert.equal(bound.colorRpcAttempts, 1);
    assert.equal(bound.colorRpcNulls, 1);

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(exports.diagState("test").colorRpcAttempts, 1, "no retry is scheduled");
    exports.colorStore.setColor("all", "text", "#FF0000");
    await exports.colorStore.saveNow();
    const local = exports.diagState("test");
    assert.equal(local.colorSaveStatus, "local");
    assert.equal(local.colorBackendBound, false);
    assert.ok(storage.map.has(STORAGE_KEY), "the browser copy carries the palette");
    assert.equal(JSON.parse(storage.map.get(STORAGE_KEY)).all.text, "#FF0000");
  } finally {
    delete globalThis.localStorage;
  }
});

test("the self-report carries the colour-store state and the resolution path", async () => {
  // The report is the only way the desktop app can explain itself from outside:
  // it must name the backend, its writability, the overlay's own save status and
  // the counters for the RPC attempts.
  const exports = loadBundle();
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const posted = [];
  globalThis.fetch = (url, options) => {
    posted.push({ url, body: JSON.parse(options.body) });
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) });
  };
  try {
    const { ctx } = remoteOnlyCtx({ pillColors: DARK_PALETTE });
    exports.apply(ctx);
    // The RPC round trip is asynchronous, so the terminal report is posted a
    // microtask after the mount returns.
    await new Promise((resolve) => setImmediate(resolve));
    const report = posted.find((entry) => entry.body.phase === "color-backend");
    assert.ok(report !== void 0, "the terminal report is posted once the backend question is settled");
    assert.equal(report.url, "/api/cost-balance-indicator.diag");
    assert.equal(report.body.colorBackendBound, true);
    assert.equal(report.body.colorBackendKind, "remote-rpc");
    assert.equal(report.body.colorBackendWritable, true);
    assert.equal(report.body.colorBackendResolvedVia, "ctx.remote.settings");
    assert.equal(report.body.colorSaveStatus, "idle");
    assert.equal(report.body.colorSaveMessage, "");
    assert.equal(report.body.colorRpcAttempts, 1);
    assert.equal(report.body.colorRpcNulls, 0);
    // The colour report fires while the mount is still registering, so the slot
    // list is on the following ("mounted") report.
    const mountedReport = posted.find((entry) => entry.body.phase === "mounted");
    assert.ok(mountedReport !== void 0);
    assert.equal(mountedReport.body.registered.includes("cost-balance-indicator-header"), true);
    // The overlay's own status line is derived from the same status field, and it
    // now says 已保存 instead of 已存本机（主机未接受…）.
    exports.colorStore.setColor("all", "background", "#654321");
    await exports.colorStore.saveNow();
    assert.equal(exports.diagState("test").colorSaveStatus, "saved");
    const element = exports.PillColorPanel({
      t: (key) => ({ "colors.save.saved": "已保存", "colors.save.local": "已存本机", "colors.save": "保存", "colors.preview": "预览", "colors.hint": "hint", "colors.topup": "充值", "colors.mode.all": "整体", "colors.mode.single": "单个", "colors.text": "文字色", "colors.border": "边框色", "colors.background": "背景色", "colors.value": "亮度", "colors.reset.one": "恢复浅色默认", "colors.reset.all": "全部恢复浅色默认", "colors.preset": "预设", "colors.preset.dark": "深色", "colors.preset.dark.tip": "深色", "colors.preset.light": "浅白", "colors.preset.light.tip": "浅白", "colors.eyedropper": "取色" }[key] ?? key),
      pillKey: "turnBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
    });
    const status = collect(element).find((node) => node.props["data-cost-balance-save-status"] !== void 0);
    assert.equal(status.props["data-cost-balance-save-status"], "saved");
    assert.equal(status.children[0], "已保存");
  } finally {
    delete globalThis.fetch;
    delete globalThis.localStorage;
  }
});

test("the self-report counts the overlay's price rows", () => {
  // The period pill's price row is the piece that used to be missing, and the
  // desktop app's renderer cannot be inspected from outside: `priceRows` is how
  // the running app proves the row actually reached the DOM.
  const dom = fakeDom({ domCounts: { "[data-cost-balance-price]": [{}, {}] } });
  const posted = [];
  globalThis.fetch = (url, options) => {
    posted.push({ url, body: JSON.parse(options.body) });
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) });
  };
  try {
    const exports = loadBundle();
    assert.equal(exports.diagState("test").priceRows, 2);
    const body = JSON.parse(exports.reportDiagnostics("painted"));
    assert.equal(body.priceRows, 2);
    assert.equal(posted.at(-1).url, "/api/cost-balance-indicator.diag");
    // A page that rendered no overlay reports zero rather than a missing field.
    dom.document.domCounts["[data-cost-balance-price]"] = [];
    assert.equal(exports.diagState("test").priceRows, 0);
    // The other DOM counters still ride along, and the field exists either way.
    assert.equal(typeof exports.diagState("test").domPills, "number");
  } finally {
    delete globalThis.fetch;
    dom.restore();
  }
  // No document at all (a non-browser host): the counter is -1, exactly like the
  // DOM counters next to it, never undefined.
  const bareExports = loadBundle();
  assert.equal(bareExports.diagState("test").priceRows, -1);
});

test("opening an overlay reports its own render, so the host can count the price rows", () => {
  // None of the other reports (activate / mounted / painted / colour-backend) is
  // posted while a panel is open, so the overlay posts its own after its commit —
  // that is what makes `priceRows` observable in the running app.
  const dom = fakeDom({ domCounts: { "[data-cost-balance-price]": [{}] } });
  const posted = [];
  globalThis.fetch = (url, options) => {
    posted.push({ url, body: JSON.parse(options.body) });
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true }) });
  };
  try {
    const { exports, effects } = loadBundleWithEffects();
    const mounted = mount(exports);
    const panel = (note) => exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "peak",
      tip: "tip",
      priceNote: note,
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" }
    });
    panel(exports.officialPriceNoteFor(mounted.t(exports.NS_PEAK), "offpeak"));
    assert.equal(effects.length, 1, "the panel registers exactly one commit callback");
    posted.length = 0;
    effects[0]();
    assert.equal(posted.length, 1, "one report per opened overlay");
    assert.equal(posted[0].url, "/api/cost-balance-indicator.diag");
    assert.equal(posted[0].body.phase, "overlay");
    assert.equal(posted[0].body.priceRows, 1, "the row is in the DOM by the time the report goes out");
    // A pill that passes no price row posts nothing: there is nothing to prove.
    const bare = loadBundleWithEffects();
    bare.exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved: { text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" }
    });
    posted.length = 0;
    bare.effects[0]();
    assert.equal(posted.length, 0, "no price note, no report");
  } finally {
    delete globalThis.fetch;
    dom.restore();
  }
});

test("a client without settingsScope or modelDirectories still mounts the pills", () => {
  // This is the exact shape of the desktop shell's bundled client, and the reason
  // the required services were cut to `slots` + `locale`: the app aborts its whole
  // boot when a client entry stays pending ("1 entry did not activate"), so
  // requiring settingsScope made the desktop app unusable.
  const exports = loadBundle();
  // No required service at all: a pending client entry aborts the desktop app's
  // entire boot, so the services are waited for inside sub-fibers instead.
  assert.deepEqual(exports.inject, []);
  const registrations = [];
  const warnings = [];
  const ctx = {
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    logger: { warn: (message) => warnings.push(message) },
    slots: {
      inject: (name, callback) => callback(),
      register: (options, component) => { registrations.push({ options, component }); return () => {}; }
    }
  };
  exports.apply(ctx);
  const ids = registrations.map((item) => item.options.id).sort();
  assert.deepEqual(ids, [
    "cost-balance-indicator-balance",
    "cost-balance-indicator-header",
    "cost-balance-indicator-peak",
    "cost-balance-indicator-turn"
  ], "the four pills mount without a settings service");
  // The period pill tolerates a missing model directory: it falls back to
  // "assume DeepSeek" instead of throwing into the render path.
  const period = registrations.find((item) => item.options.id === "cost-balance-indicator-peak");
  assert.deepEqual(period.options.inject("session-1"), { directory: null });
  // There is no host backend here either, so the store reports no save yet.
  assert.equal(exports.colorStore.getSnapshot().save.status, "idle");
});

test("a slot the client no longer has costs only that surface", () => {
  // The desktop shell and newer bundled cores are the reason: if one slot name is
  // gone, the remaining pills and the colour store must still register.
  const exports = loadBundle();
  const registrations = [];
  const warnings = [];
  const scope = fakeScope();
  exports.apply({
    effect: (callback) => { callback(); return () => {}; },
    locale: { register: () => () => {} },
    modelDirectories: { directoryFor: () => ({ store: { subscribe: () => () => {}, getSnapshot: () => null }, load: () => Promise.resolve() }) },
    settingsScope: { bind: () => scope },
    logger: { warn: (message) => warnings.push(message) },
    slots: {
      inject: (name, callback) => {
        if (name === "settings.plugin.item") throw new Error("no such slot");
        callback();
      },
      register: (options, component) => { registrations.push({ options, component }); return () => {}; }
    }
  });
  const ids = registrations.map((item) => item.options.id).sort();
  assert.deepEqual(ids, [
    "cost-balance-indicator-balance",
    "cost-balance-indicator-compaction-general",
    "cost-balance-indicator-header",
    "cost-balance-indicator-peak",
    "cost-balance-indicator-turn"
  ], "five of the six surfaces survive");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /settings\.plugin\.item is unavailable/);
});

test("the colour store adopts a persisted palette from the settings scope", () => {
  const exports = loadBundle();
  const scope = fakeScope({
    pillColors: {
      mode: "single",
      all: { text: "#111111", border: "", background: "" },
      peak: { text: "", border: "#222222", background: "" },
      headerBalance: { text: "", border: "", background: "" },
      turnCost: { text: "", border: "", background: "" },
      turnBalance: { text: "#333333", border: "", background: "" }
    }
  });
  const mounted = mount(exports, { scope });
  const snapshot = exports.colorStore.getSnapshot();
  assert.equal(snapshot.mode, "single");
  assert.equal(snapshot.colors.all.text, "#111111");
  const pills = renderFour(exports, mounted);
  assert.equal(pills.turnBalance.props.style.color, "#333333");
  assert.equal(pills.peak.props.style.border, "1px solid #222222");
  assert.equal(pills.turnCost.props.style.color, "#111111", "the global entry still applies where the pill is silent");
  // Unparsable values are dropped instead of trusted.
  assert.equal(exports.normalizeColorSettings({ all: { text: "javascript:alert(1)" } }).all.text, "");
});

test("the shared balance store polls at most once per minute", async () => {
  const exports = loadBundle();
  const calls = [];
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return Promise.resolve({ status: 200, json: () => Promise.resolve(READY_STATE.data) });
  };
  const originalSetInterval = globalThis.setInterval;
  const timers = [];
  globalThis.setInterval = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  globalThis.clearInterval = () => {};
  try {
    const stopHeader = exports.balanceStore.subscribe(() => {});
    const stopTurn = exports.balanceStore.subscribe(() => {});
    assert.equal(timers.length, 1, "the header pill and the turn pill share one poll");
    assert.equal(timers[0].ms, 60000);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/deepseek.balance");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(exports.balanceStore.getSnapshot().status, "ready");
    timers[0].fn();
    assert.equal(calls[1].url, "/api/deepseek.balance?force=1");
    await new Promise((resolve) => setImmediate(resolve));
    stopHeader();
    stopTurn();
    assert.equal(exports.balanceStore.getSnapshot().data.totalBalance, 32.65);
  } finally {
    globalThis.setInterval = originalSetInterval;
    delete globalThis.fetch;
  }
});

// ------------------------------------------- picking mode / animations -------

/**
 * A fake DOM, big enough for the picking mode and the injected stylesheet: it
 * records the nodes the module appends and the listeners it registers, so the
 * tests can dispatch a `mousemove`/`mousedown` by hand and assert what the mode
 * did with it. `colors` maps one element (or any object) to the computed style
 * `getComputedStyle` must return for it.
 */
function fakeDom(options = {}) {
  const nodes = [];
  const listeners = [];
  const styleById = new Map();
  const colors = { lookup: options.computedStyle ?? null, map: options.colors ?? new Map() };
  const makeNode = (tag) => {
    const node = {
      tagName: String(tag).toUpperCase(),
      id: "",
      textContent: "",
      style: { cssText: "", background: "" },
      children: [],
      parentElement: null,
      setAttribute: (name, value) => { node[name] = value; },
      appendChild: (child) => {
        node.children.push(child);
        nodes.push(child);
        if (child.id !== "") styleById.set(child.id, child);
        return child;
      },
      remove: () => {
        const at = nodes.indexOf(node);
        if (at !== -1) nodes.splice(at, 1);
      }
    };
    return node;
  };
  const documentStub = {
    nodes,
    listeners,
    head: makeNode("head"),
    body: makeNode("body"),
    createElement: (tag) => makeNode(tag),
    getElementById: (id) => (styleById.has(id) ? styleById.get(id) : null),
    /**
     * The module's diagnostics count nodes with `querySelectorAll`; the map is
     * mutable so a test can change what the "document" holds between reports.
     */
    domCounts: options.domCounts ?? {},
    querySelectorAll: (selector) => documentStub.domCounts[selector] ?? [],
    // The module only ever walks its own fake nodes; a plain object has no
    // computed background, so the walk ends at the element itself.
    getComputedStyle: (element) => {
      if (typeof colors.lookup === "function") return colors.lookup(element);
      return colors.map.get(element) ?? { backgroundColor: "rgba(0, 0, 0, 0)", color: "rgb(0, 0, 0)" };
    },
    addEventListener: (type, handler, capture) => { listeners.push({ type, handler, capture }); },
    removeEventListener: (type, handler) => {
      const at = listeners.findIndex((entry) => entry.type === type && entry.handler === handler);
      if (at !== -1) listeners.splice(at, 1);
    },
    elementFromPoint: (x, y) => (typeof options.elementFromPoint === "function" ? options.elementFromPoint(x, y) : null)
  };
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    computed: globalThis.getComputedStyle,
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
    matchMedia: globalThis.matchMedia
  };
  globalThis.document = documentStub;
  globalThis.window = { __ModuleLoader__: { load: () => {} } };
  globalThis.getComputedStyle = documentStub.getComputedStyle;
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 800;
  if (options.reducedMotion === true) globalThis.matchMedia = () => ({ matches: true });
  else globalThis.matchMedia = () => ({ matches: false });
  const restore = () => {
    if (original.document === void 0) delete globalThis.document; else globalThis.document = original.document;
    if (original.window === void 0) delete globalThis.window; else globalThis.window = original.window;
    if (original.computed === void 0) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = original.computed;
    if (original.innerWidth === void 0) delete globalThis.innerWidth; else globalThis.innerWidth = original.innerWidth;
    if (original.innerHeight === void 0) delete globalThis.innerHeight; else globalThis.innerHeight = original.innerHeight;
    if (original.matchMedia === void 0) delete globalThis.matchMedia; else globalThis.matchMedia = original.matchMedia;
  };
  return {
    nodes,
    listeners,
    body: documentStub.body,
    document: documentStub,
    /** Point the element→computed-style look-up at a new factory. */
    setColors: (next) => { colors.lookup = next; },
    /** Remember a `getElementById` hit, i.e. the stylesheet the module injected. */
    registerStyle: (id, node) => styleById.set(id, node),
    listener: (type) => listeners.find((entry) => entry.type === type),
    /** The attribute the picking mode stamps on its own nodes. */
    nodeWith: (name) => nodes.find((node) => node[name] !== void 0),
    restore
  };
}

/** The picking mode's capture layer (what a click really lands on). */
function pickerLayerOf(dom) {
  return dom.nodeWith("data-cost-balance-picker-layer");
}

/** A mouse event shaped like the ones the layer receives. */
function mouseEvent(extra = {}) {
  return { clientX: 0, clientY: 0, button: 0, key: "", preventDefault: () => {}, stopPropagation: () => {}, ...extra };
}

test("the eyedropper button is offered even where the browser has no EyeDropper", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const renderPanel = () => exports.PillColorPanel({
    t: mounted.t(exports.NS_BALANCE),
    pillKey: "turnBalance",
    tip: "tip",
    anchor: { top: 0, left: 0 },
    resolved: { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }
  });
  // No document, no `window.EyeDropper`: the mode is ours, so the entry is there.
  assert.equal(typeof globalThis.window.EyeDropper, "undefined");
  const without = collect(renderPanel()).find((node) => node.props["data-cost-balance-eyedropper"] === "1");
  assert.ok(without !== void 0, "the 取色 button renders without window.EyeDropper");
  assert.equal(without.children[0], "🖌 取色");
  // …and with the native API present the same button arms ours instead of it.
  const original = globalThis.window.EyeDropper;
  globalThis.window.EyeDropper = function EyeDropper() { throw new Error("the native picker must not be constructed"); };
  try {
    const withNative = collect(renderPanel()).find((node) => node.props["data-cost-balance-eyedropper"] === "1");
    assert.ok(withNative !== void 0);
    assert.equal(withNative.children[0], "🖌 取色");
    assert.equal(exports.pickerArmed(), false, "rendering never arms the mode by itself");
  } finally {
    if (original === void 0) delete globalThis.window.EyeDropper; else globalThis.window.EyeDropper = original;
  }
});

test("arming creates the capture layer and a mousemove fills the chip with the pointer's colour", () => {
  const previousDocument = globalThis.document;
  const dom = fakeDom();
  try {
    const exports = loadBundle();
    const mounted = mount(exports);
    assert.equal(exports.armColorPicker(mounted.t(exports.NS_BALANCE), () => {}), true);
    assert.equal(exports.pickerArmed(), true);
    const layer = pickerLayerOf(dom);
    assert.ok(layer !== void 0, "the capture layer exists");
    assert.match(layer.style.cssText, /position:fixed/);
    assert.match(layer.style.cssText, /inset:0/);
    assert.match(layer.style.cssText, /cursor:crosshair/);
    assert.match(layer.style.cssText, /z-index:10000/, "at the panel's own layer");
    assert.match(layer.style.cssText, /background:transparent/, "the page is never tinted");
    const chip = dom.nodeWith("data-cost-balance-picker-chip");
    assert.ok(chip !== void 0, "the preview chip exists");
    assert.match(chip.style.cssText, /width:90px/);
    assert.match(chip.style.cssText, /height:26px/);
    const hint = dom.nodeWith("data-cost-balance-picker-hint");
    assert.equal(hint.textContent, "左键确认 · 右键取消");
    assert.equal(exports.pickerHintLabel(mounted.t(exports.NS_BALANCE)), "左键确认 · 右键取消");
    assert.equal(exports.pickerHintLabel(mounted.t(exports.NS_PEAK)), "左键确认 · 右键取消");

    // The colour comes from elementFromPoint → the element's computed background.
    globalThis.document.elementFromPoint = () => dom.body;
    dom.setColors(() => ({ backgroundColor: "rgb(255, 0, 0)" }));
    const move = dom.listener("mousemove");
    assert.ok(move !== void 0, "the layer listens for mousemove");
    move.handler(mouseEvent({ clientX: 100, clientY: 200 }));
    assert.equal(exports.pickerColorHex(), "#FF0000");
    assert.equal(dom.nodeWith("data-cost-balance-picker-hex").textContent, "#FF0000");
    assert.equal(dom.nodeWith("data-cost-balance-picker-swatch").style.background, "#FF0000");
    assert.equal(chip.style.transform, "translate(114px, 214px)", "the chip follows at +14/+14");
    exports.disarmColorPicker();
    assert.equal(dom.listeners.length, 0, "disarming removes the listeners");
  } finally {
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
  }
});

test("a left click writes the sampled colour into the store and disarms", () => {
  const previousDocument = globalThis.document;
  const dom = fakeDom();
  const exports = loadBundle();
  try {
    const scope = fakeScope();
    const mounted = mount(exports, { scope });
    const before = exports.colorStore.getSnapshot().colors.turnBalance.text;
    globalThis.document.elementFromPoint = () => dom.body;
    dom.setColors(() => ({ backgroundColor: "rgb(18, 52, 86)" }));
    exports.armColorPicker(mounted.t(exports.NS_BALANCE), (hex) => exports.colorStore.setColor("turnBalance", "text", hex));
    dom.listener("mousemove").handler(mouseEvent({ clientX: 10, clientY: 10 }));
    assert.equal(exports.pickerColorHex(), "#123456");
    // The layer covers everything, so the confirm is the button-0 mousedown on it.
    dom.listener("mousedown").handler(mouseEvent({ clientX: 10, clientY: 10, button: 0 }));
    assert.equal(exports.pickerArmed(), false, "confirming exits the mode");
    assert.equal(exports.colorStore.getSnapshot().colors.turnBalance.text, "#123456");
    assert.notEqual(exports.colorStore.getSnapshot().colors.turnBalance.text, before);
    assert.equal(pickerLayerOf(dom), void 0, "the layer is gone");
    assert.equal(dom.nodeWith("data-cost-balance-picker-chip"), void 0, "the chip is gone");
    assert.equal(dom.listeners.length, 0, "no listener is left dangling");
  } finally {
    exports.disarmColorPicker();
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
  }
});

test("a right click, a contextmenu and Escape all cancel without writing", () => {
  const cases = [
    ["right click", (dom) => dom.listener("mousedown").handler(mouseEvent({ button: 2 }))],
    ["contextmenu", (dom) => dom.listener("contextmenu").handler(mouseEvent())],
    ["Escape", (dom) => dom.listener("keydown").handler(mouseEvent({ key: "Escape" }))]
  ];
  for (const [name, cancel] of cases) {
    const previousDocument = globalThis.document;
    const dom = fakeDom();
    const exports = loadBundle();
    const scope = fakeScope();
    const mounted = mount(exports, { scope });
    const writes = [];
    globalThis.document.elementFromPoint = () => dom.body;
    dom.setColors(() => ({ backgroundColor: "rgb(255, 255, 0)" }));
    exports.armColorPicker(mounted.t(exports.NS_BALANCE), (hex) => writes.push(hex));
    dom.listener("mousemove").handler(mouseEvent({ clientX: 5, clientY: 5 }));
    assert.equal(exports.pickerColorHex(), "#FFFF00", `${name}: the chip saw a colour first`);
    cancel(dom);
    assert.equal(exports.pickerArmed(), false, `${name} exits the mode`);
    assert.deepEqual(writes, [], `${name} writes nothing`);
    assert.equal(exports.colorStore.getSnapshot().colors.all.text, "", `${name} leaves the store alone`);
    assert.equal(pickerLayerOf(dom), void 0, `${name} removes the layer`);
    assert.equal(dom.listeners.length, 0, `${name} leaves no listener`);
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
  }
});

test("the sampled colour falls back to the nearest painted ancestor, or to the text colour", () => {
  const dom = fakeDom();
  try {
    const exports = loadBundle();
    const parent = { parentElement: null };
    const child = { parentElement: parent };
    dom.setColors((element) => element === child
      ? { backgroundColor: "rgba(0, 0, 0, 0)", color: "rgb(5, 6, 7)" }
      : { backgroundColor: "rgb(18, 52, 86)", color: "rgb(0, 0, 0)" });
    assert.equal(exports.resolveElementColor(child), "#123456", "the ancestor's fill wins");
    // No painted ancestor at all: plain text on the page background.
    parent.parentElement = null;
    dom.setColors(() => ({ backgroundColor: "transparent", color: "rgb(15, 17, 21)" }));
    assert.equal(exports.resolveElementColor(child), "#0F1115");
    // The normalisation keeps only #RRGGBB, whatever the browser serialises.
    assert.equal(exports.computedColorToHex("rgba(18, 52, 86, 1)"), "#123456");
    assert.equal(exports.computedColorToHex("#123456"), "#123456");
    assert.equal(exports.computedColorToHex("#abc"), "#AABBCC");
    assert.equal(exports.computedColorToHex("color(display-p3 1 0 0)"), "");
    assert.equal(exports.computedColorToHex("rgba(0, 0, 0, 0)"), "");
    assert.equal(exports.resolveElementColor(null), "");
  } finally {
    dom.restore();
  }
});

test("the overlay stylesheet is injected once, keyframes and all", () => {
  const previousDocument = globalThis.document;
  const dom = fakeDom();
  try {
    const exports = loadBundle();
    const first = exports.injectOverlayStyles();
    assert.equal(first, globalThis.document);
    const styles = dom.nodes.filter((node) => node.tagName === "STYLE");
    assert.equal(styles.length, 1);
    const css = styles[0].textContent;
    for (const name of ["dsh-cbi-overlay-pop", "dsh-cbi-overlay-pop-out", "dsh-cbi-save-pulse", "dsh-cbi-save-shake", "dsh-cbi-save-pop"]) {
      assert.match(css, new RegExp(`@keyframes ${name}`), `${name} is declared`);
    }
    assert.match(css, /prefers-reduced-motion: reduce/);
    // Nothing animates the pre-click state, which is what keeps a freshly mounted
    // overlay motionless however the store's save status happens to read.
    assert.doesNotMatch(css, /\[data-cost-balance-save-state="idle"\]/);
    for (const state of ["saving", "saved", "error"]) {
      assert.match(css, new RegExp(`\\[data-cost-balance-save-state="${state}"\\]`), `the ${state} state has its own rule`);
    }
    // A second call — and a bundle that finds the tag already in the document —
    // must not add another one.
    exports.injectOverlayStyles();
    assert.equal(dom.nodes.filter((node) => node.tagName === "STYLE").length, 1, "idempotent");
    const second = loadBundle();
    second.injectOverlayStyles();
    second.injectOverlayStyles();
    assert.equal(dom.nodes.filter((node) => node.tagName === "STYLE").length, 1, "a second copy adopts the existing tag");
  } finally {
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
    // Without a document the whole thing is a no-op rather than a throw.
    const exports = loadBundle();
    assert.equal(exports.injectOverlayStyles(), null);
  }
});

test("the panel carries the pop animation, growing out of its own pill", () => {
  const previousDocument = globalThis.document;
  const dom = fakeDom();
  try {
    const exports = loadBundle();
    const mounted = mount(exports);
    const anchor = { top: 100, left: 200 };
    const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
    const element = exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor,
      resolved
    });
    // The anchor sits at x=200 of a 340px panel and y=100 of a 344px one, so the
    // transform origin is the pill, not the panel's middle.
    assert.equal(element.props.style.transformOrigin, exports.overlayTransformOrigin(anchor).css);
    assert.equal(element.props.style.transformOrigin, "59% 29%");
    assert.equal(element.props.style.animation, exports.OVERLAY_OPEN_ANIM);
    assert.equal(element.props.style.animation, "dsh-cbi-overlay-pop 140ms cubic-bezier(0.2, 0.9, 0.3, 1.35) both");
    // The wrapper hands its closing phase down, and the reverse is the 100ms one.
    const closing = exports.PillColorPanel({
      t: mounted.t(exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor,
      resolved,
      phase: "closing"
    });
    assert.equal(closing.props.style.animation, exports.OVERLAY_CLOSE_ANIM);
    assert.equal(closing.props.style.transformOrigin, element.props.style.transformOrigin);
  } finally {
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
  }
});

test("reduced motion keeps the fade and drops the scale, for the panel and the save button", () => {
  const previousDocument = globalThis.document;
  const dom = fakeDom({ reducedMotion: true });
  try {
    const exports = loadBundle();
    const mounted = mount(exports);
    const anchor = { top: 0, left: 0 };
    const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
    const element = exports.PillColorPanel({ t: mounted.t(exports.NS_BALANCE), pillKey: "turnBalance", tip: "tip", anchor, resolved });
    assert.equal(exports.overlayAnimationCss("opening"), exports.OVERLAY_OPEN_FADE);
    assert.equal(exports.overlayAnimationCss("closing"), exports.OVERLAY_CLOSE_FADE);
    assert.equal(element.props.style.animation, exports.OVERLAY_OPEN_FADE);
    assert.doesNotMatch(element.props.style.animation, /scale/);
    // The save button's animation is driven by the very status the store holds —
    // but only once its own click armed it, and the stylesheet's media query is
    // what makes that motion-free.
    const save = collect(element).find((node) => node.props["data-cost-balance-save"] === "now");
    assert.equal(save.props["data-cost-balance-save-state"], "idle", "an unclicked button never animates");
    assert.equal(exports.colorStore.getSnapshot().save.status, "idle");
  } finally {
    if (previousDocument === void 0) delete globalThis.document; else globalThis.document = previousDocument;
    dom.restore();
  }
});

test("the save button claims no animation state until the user clicks it", async () => {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  /** One mount: its own hook memory, i.e. one panel that stays open. */
  const panel = (scope) => {
    const { exports, hooks } = loadBundleWithHooks();
    const mounted = mount(exports, { scope });
    const renderSave = () => {
      hooks.slot = 0;
      return collect(exports.PillColorPanel({
        t: mounted.t(exports.NS_BALANCE),
        pillKey: "turnBalance",
        tip: "tip",
        anchor: { top: 0, left: 0 },
        resolved
      })).find((node) => node.props["data-cost-balance-save"] === "now");
    };
    return { exports, mounted, renderSave };
  };
  try {
    // --- the store already holds "saved" from an earlier auto-save ------------
    // Mounting the overlay used to replay the tick animation for that stale
    // state; the button must claim no state at all until it is clicked.
    const savedSide = panel(fakeScope());
    savedSide.exports.colorStore.setColor("all", "background", "#123456");
    await savedSide.exports.colorStore.saveNow();
    assert.equal(savedSide.exports.colorStore.getSnapshot().save.status, "saved");
    assert.equal(savedSide.renderSave().props["data-cost-balance-save-state"], "idle", "an untouched button claims nothing, even after a save");
    assert.equal(savedSide.renderSave().props["aria-busy"], false);
    // The click is what arms it, and from then on the attribute follows the real
    // status: the debounced write is in flight, so the pulse state is visible.
    const pending = savedSide.renderSave().props.onClick();
    const saving = savedSide.renderSave();
    assert.equal(saving.props["data-cost-balance-save-state"], "saving");
    assert.equal(saving.props["aria-busy"], true);
    await pending;
    const saved = savedSide.renderSave();
    assert.equal(saved.props["data-cost-balance-save-state"], "saved");
    assert.equal(saved.props["aria-busy"], false);
    assert.equal(saved.props.style.background, "var(--dsw-alias-brand-primary, #4f7cff)", "saved is still the green/primary fill");
    // --- the store already holds a refusal ------------------------------------
    // A panel opened after a failed write used to shake on mount too.
    const refusedScope = fakeScope();
    refusedScope.set = () => Promise.reject(new Error("host refused the section"));
    const failedSide = panel(refusedScope);
    failedSide.exports.colorStore.setColor("all", "background", "#654321");
    await failedSide.exports.colorStore.saveNow();
    assert.equal(failedSide.exports.colorStore.getSnapshot().save.status, "error");
    assert.equal(failedSide.renderSave().props["data-cost-balance-save-state"], "idle", "a refusal from before this panel opened does not shake it on mount");
    // The status line still reports the host's real error: only the animation is
    // gated, never the truth.
    const status = collect(failedSide.exports.PillColorPanel({
      t: failedSide.mounted.t(failedSide.exports.NS_BALANCE),
      pillKey: "turnBalance",
      tip: "tip",
      anchor: { top: 0, left: 0 },
      resolved
    })).find((node) => node.props["data-cost-balance-save-status"] !== void 0);
    assert.equal(status.props["data-cost-balance-save-status"], "error");
    // Clicking it now is what arms it: the click starts a fresh write, so the
    // pulse comes first and the refusal's shake follows it — in that order.
    const failedPending = failedSide.renderSave().props.onClick();
    assert.equal(failedSide.renderSave().props["data-cost-balance-save-state"], "saving");
    await failedPending;
    const failed = failedSide.renderSave();
    assert.equal(failed.props["data-cost-balance-save-state"], "error");
    assert.equal(failedSide.exports.colorStore.getSnapshot().save.status, "error");
    assert.notEqual(failed.props.style.background, saved.props.style.background, "an error drops the green fill");
  } finally {
    delete globalThis.localStorage;
  }
});

test("hovering a pill runs the pop on open and the reverse on close", () => {
  // A React stub that remembers hook state, so one wrapper can be rendered
  // again after an event — which is the only way to observe the close phase.
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = [];
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  globalThis.clearTimeout = () => {};
  // The module schedules other timers too (a diag report, a save-status clear),
  // so pick the hover timer by its own delay rather than by position.
  const timerFor = (ms) => {
    const entry = timers.find((item) => item.ms === ms);
    assert.ok(entry !== void 0, `no timer with a ${ms}ms delay`);
    return entry;
  };
  try {
    const { exports, hooks } = loadBundleWithHooks();
    const mounted = mount(exports);
    const t = mounted.t(exports.NS_PEAK);
    const props = {
      t,
      pillKey: "turnCost",
      tip: "本轮实际 token 消费费用",
      builtIn: exports.DEFAULT_PILL_COLORS.neutral
    };
    const render = () => {
      hooks.slot = 0;
      return deepExpand(exports.ColorablePill(props));
    };
    let element = render();
    const root = element;
    assert.equal(root.children[1] ?? null, null, "nothing before hover");
    root.props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ top: 100, bottom: 120, left: 40 }) } });
    timerFor(exports.HOVER_OPEN_MS).fn();
    timers.length = 0;
    element = render();
    let panel = collect(element).find((node) => node.props["data-cost-balance-colors"] !== void 0);
    assert.ok(panel !== void 0, "the pop is playing while the panel is opening");
    assert.equal(panel.props.style.animation, exports.OVERLAY_OPEN_ANIM);
    assert.equal(panel.props.style.transformOrigin, exports.overlayTransformOrigin({ top: 128, left: 40 }).css);
    // Leaving the pill marks the panel closing instead of dropping it, so the
    // reverse can play.
    element.props.onMouseLeave();
    timerFor(exports.HOVER_CLOSE_MS).fn();
    timers.length = 0;
    element = render();
    panel = collect(element).find((node) => node.props["data-cost-balance-colors"] !== void 0);
    assert.ok(panel !== void 0, "still mounted while the reverse plays");
    assert.equal(panel.props.style.animation, exports.OVERLAY_CLOSE_ANIM);
    // The end of that animation is what removes it.
    panel.props.onAnimationEnd();
    element = render();
    assert.equal(collect(element).find((node) => node.props["data-cost-balance-colors"] !== void 0), void 0, "the animation end unmounts the panel");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

// ------------------------------------------------- statutory holidays ------

test("the browser half bills statutory holidays as off-peak all day", () => {
  const exports = loadBundle();
  // The official 2026 安排 (国办发明电〔2025〕7号): National Day runs 10-01…10-07,
  // so 10-08 is an ordinary Thursday and must stay peak at 10:00 Beijing.
  assert.equal(exports.currentPeriod(new Date("2026-10-08T02:00:00Z")), "peak");
  // Friday 2026-10-02 10:00 Beijing is inside the holiday: off-peak all day.
  assert.equal(exports.currentPeriod(new Date("2026-10-02T02:00:00Z")), "offpeak");
  assert.equal(exports.isCnHoliday(new Date("2026-10-02T02:00:00Z")), true);
  assert.equal(exports.isCnHoliday(new Date("2026-10-08T02:00:00Z")), false);
  // Every official off day is listed, and the array carries no extra date.
  assert.equal(exports.CN_HOLIDAYS_2026.length, 33);
  assert.equal(exports.CN_HOLIDAYS_2026.includes("2026-10-08"), false);
  // A mid-week holiday at 10:00 Beijing — peak on any ordinary weekday.
  assert.equal(exports.currentPeriod(new Date("2026-05-04T02:00:00Z")), "offpeak");
  // 04-30, the Thursday before the May Day run, is an ordinary working day.
  assert.equal(exports.currentPeriod(new Date("2026-04-30T02:00:00Z")), "peak");
});

// ---------------------------------------------------- top-up / sign-in URL ---

test("the top-up link follows the endpoint the host resolved", () => {
  const exports = loadBundle();
  const mounted = mount(exports);
  const resolved = { text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" };
  const hrefFor = (data) => {
    const original = exports.balanceStore.getSnapshot;
    exports.balanceStore.getSnapshot = () => ({ status: "ready", error: null, data });
    try {
      const links = collect(exports.PillColorPanel({
        t: mounted.t(exports.NS_BALANCE),
        pillKey: "headerBalance",
        tip: "tip",
        anchor: { top: 0, left: 0 },
        resolved
      })).filter((node) => node.type === "a");
      assert.equal(links.length, 1);
      return links[0].props.href;
    } finally {
      exports.balanceStore.getSnapshot = original;
    }
  };
  // The host hands back the endpoint's own pages …
  assert.equal(hrefFor({ ok: true, totalBalance: 32.65, topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" }), "https://gw.example.com/top_up");
  // … the sign-in page when the endpoint answered without a balance (no key) …
  assert.equal(hrefFor({ ok: false, error: "no key", topUpUrl: "https://gw.example.com/top_up", loginUrl: "https://gw.example.com/sign_in" }), "https://gw.example.com/sign_in");
  // … and the official page is the fallback while no payload carries one.
  assert.equal(hrefFor(void 0), "https://platform.deepseek.com/top_up");
  assert.equal(hrefFor({ ok: false, error: "no key" }), "https://platform.deepseek.com/top_up");
});
