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

/** Render the four pills of one mount. */
function renderFour(exports, mounted, state = READY_STATE) {
  exports.balanceStore.getSnapshot = () => state;
  const header = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-header");
  const period = entryFor(mounted.registrations, HEADER, "cost-balance-indicator-peak");
  const turn = entryFor(mounted.registrations, TURN, "cost-balance-indicator-turn");
  const turnBalance = entryFor(mounted.registrations, TURN, "cost-balance-indicator-balance");
  return {
    // `peak` is the header period pill, `headerBalance` the merged spend+balance one.
    peak: pillOf(render(period, mounted, { directory: null, load: () => {} })),
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
  // period state; the period pill shows the state and the countdown, and no ¥.
  const pills = renderFour(exports, mounted);
  assert.equal(pills.headerBalance.children[0], "本会话 ¥0.94 · 余额 ¥32.65");
  assert.match(pills.peak.children[0], /闲时|高峰/);
  assert.doesNotMatch(pills.peak.children[0], /¥/);
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
  assert.doesNotMatch(pill.children[0], /¥/, "the session cost moved to the merged pill");
  assert.equal(pill.props.style.lineHeight, "18px");
  // The detail text moved into the colour overlay, so it travels as a prop.
  assert.match(element.props.tip, /切换计价时段/);
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
  const pills = renderFour(exports, mounted);
  assert.equal(pills.peak.props.style.color, "#0f7b3d");
  assert.equal(pills.turnCost.props.style.color, "#0f7b3d");
  assert.equal(pills.headerBalance.props.style.color, "#0f7b3d");
  assert.equal(pills.turnBalance.props.style.color, "#0f7b3d");
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
  assert.equal(pills.turnBalance.props.style.color, "#0f7b3d", "an untouched field keeps the built-in colour");
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
  const reset = collect(element).find((node) => node.props.type === "button" && node.children[0] === "恢复默认");
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

test("only the header balance overlay offers the top-up shortcut", () => {
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
  const link = anchorsFor("headerBalance");
  assert.equal(link.length, 1);
  assert.equal(link[0].props.href, "https://platform.deepseek.com/top_up");
  assert.equal(link[0].props.target, "_blank");
  assert.equal(link[0].props.rel, "noreferrer noopener");
  assert.equal(link[0].children[0], "充值");
  assert.match(link[0].props.title, /platform\.deepseek\.com\/top_up/);
  for (const pillKey of ["peak", "turnCost", "turnBalance"]) {
    assert.equal(anchorsFor(pillKey).length, 0, `${pillKey} must not carry the link`);
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

test("the overlay offers the default, dark and light presets", () => {
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
  assert.deepEqual(buttons.map((node) => node.props["data-cost-balance-preset"]), ["default", "dark", "light"]);
  assert.deepEqual(buttons.map((node) => node.children[0]), ["默认", "深色", "浅白"]);
  // The plugin's own palette is the default preset, and it is the active one
  // while nothing is customised.
  assert.equal(buttons[0].props["aria-pressed"], true);
  assert.equal(buttons[1].props["aria-pressed"], false);
  assert.equal(exports.PILL_PRESETS[0].colors, null, "the default preset carries no colours");
  assert.match(buttons[1].props.title, /Frapp/);
  assert.match(buttons[2].props.title, /Latte/);

  // The two themed presets are the skin's own surfaces, so a pill drawn with
  // them reads as native in each mode (catppuccin Frappé / Latte).
  assert.deepEqual({ ...exports.PILL_PRESETS[1].colors }, { text: "#C6D0F5", border: "#626880", background: "#414559" });
  assert.deepEqual({ ...exports.PILL_PRESETS[2].colors }, { text: "#4C4F69", border: "#BCC0CC", background: "#EFF1F5" });

  // Applying one writes the whole scope and moves the highlight.
  buttons[1].props.onClick();
  const written = scope.writes[scope.writes.length - 1].value;
  assert.equal(written.all.background, "#414559");
  assert.equal(written.all.text, "#C6D0F5");
  assert.equal(written.all.border, "#626880");
  const after = presetsOf(renderPanel());
  assert.equal(after[1].props["aria-pressed"], true, "the dark preset becomes active");
  assert.equal(after[0].props["aria-pressed"], false);
  // …and the pills really take the preset colours.
  const pills = renderFour(exports, mounted);
  assert.equal(pills.turnBalance.props.style.background, "#414559");
  assert.equal(pills.turnCost.props.style.color, "#C6D0F5");
  assert.equal(pills.headerBalance.props.style.border, "1px solid #626880");

  // Clicking 默认 is exactly the old reset: nothing custom anywhere.
  after[0].props.onClick();
  assert.equal(exports.colorStore.activePreset("all"), "default");
  assert.equal(renderFour(exports, mounted).turnBalance.props.style.background, "#d9f2e2");
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
  assert.equal(scope.writes[scope.writes.length - 1].value.all.background, "#EFF1F5");
  // Switch to "single" and the same preset lands on the hovered pill only.
  exports.colorStore.setMode("single");
  collect(renderPanel()).find((node) => node.props["data-cost-balance-preset"] === "dark").props.onClick();
  const colors = exports.colorStore.getSnapshot().colors;
  assert.equal(colors.turnBalance.background, "#414559");
  assert.equal(colors.all.background, "#EFF1F5", "the global preset is untouched");
  assert.equal(exports.colorStore.activePreset("turnBalance"), "dark");
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
