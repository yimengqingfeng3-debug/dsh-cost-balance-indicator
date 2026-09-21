// dsh-cost-balance-indicator client bundle (hand-built ModuleLoader format,
// mirroring the output shape of the installed dsh web plugins). It is the merge
// of two plugins, so one bundle renders four pills:
//
//   * session header   — the peak/off-peak + session-cost badge (dsh-peak-indicator,
//                        MIT, Copyright (c) 2026 Jim, see NOTICE) at order 20,
//                        then the DeepSeek key balance pill at order 21, to its right.
//   * turn tail        — the per-turn token price chip ("本轮 ¥0.08") at order 100,
//                        then the same balance pill at order 101, to its right.
//   * settings         — the cost & context (auto-compaction) card.
//
// Every pill keeps the price chip's palette and vertical size by default
// (fontSize 12, lineHeight 18px, padding 1px 8px, borderRadius 999, 1px border,
// CNY with two decimals). Hovering any pill opens an interactive colour overlay:
// an RGB wheel plus R/G/B and value sliders that recolour the text, border and
// background of all four pills at once (the right-hand position of the mode
// switch, the default) or of the hovered pill alone (the left-hand position).
// The overlay is built from the theme's own `--dsw-alias-*` tokens, so it follows
// whatever skin is active (for example catppuccin) instead of hard-coded colours.
window.__ModuleLoader__.load({
  id: "dsh-cost-balance-indicator",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    //#region src/client.js
    var client_exports = {};
    __export(client_exports, {
      NS: () => NS,
      NS_BALANCE: () => NS_BALANCE,
      NS_PEAK: () => NS_PEAK,
      BalanceChip: () => BalanceChip,
      ColorablePill: () => ColorablePill,
      HeaderSpend: () => HeaderSpend,
      DEFAULT_PILL_COLORS: () => DEFAULT_PILL_COLORS,
      HOVER_CLOSE_MS: () => HOVER_CLOSE_MS,
      HOVER_OPEN_MS: () => HOVER_OPEN_MS,
      PILL_KEYS: () => PILL_KEYS,
      PILL_PRESETS: () => PILL_PRESETS,
      PeakBadge: () => PeakBadge,
      PeriodBadge: () => PeriodBadge,
      PillColorPanel: () => PillColorPanel,
      activePresetId: () => activePresetId,
      TurnCost: () => TurnCost,
      apply: () => apply,
      balanceStore: () => balanceStore,
      beijingMinutes: () => beijingMinutes,
      colorStore: () => colorStore,
      currentPeriod: () => currentPeriod,
      default: () => client_default,
      en: () => en,
      formatAmount: () => formatAmount,
      formatPrice: () => formatPrice,
      hexToRgb: () => hexToRgb,
      hsvToRgb: () => hsvToRgb,
      inject: () => inject,
      isDeepseekModel: () => isDeepseekModel,
      modelPrices: () => modelPrices,
      normalizeColorSettings: () => normalizeColorSettings,
      pillStyle: () => pillStyle,
      resolvePillColors: () => resolvePillColors,
      rgbToHex: () => rgbToHex,
      rgbToHsv: () => rgbToHsv,
      zh: () => zh
    });
    module.exports = __toCommonJS(client_exports);
    var import_react = __toESM(require("react"), 1);

    /** Peak/off-peak dictionary namespace (kept from dsh-peak-indicator). */
    var NS_PEAK = "peakIndicator";
    /** Balance dictionary namespace (kept from dsh-balance-indicator). */
    var NS_BALANCE = "balanceIndicator";
    /** Historical single-namespace alias. */
    var NS = NS_PEAK;

    // ---- peak/off-peak + cost dictionaries (dsh-peak-indicator) --------------
    var zhPeak = {
      "badge.peak": "\u26A1 \u9AD8\u5CF0",
      "badge.offpeak": "\u{1F4A4} \u95F2\u65F6",
      "badge.other": "\u{1F33F} \u5176\u4ED6\u6A21\u578B",
      "badge.next": " \u00B7 {countdown} \u540E\u5207\u6362",
      "badge.cost": " \u00B7 \u672C\u4F1A\u8BDD\u00A5{amount}",
      "turn.cost": "\u672C\u8F6E \u00A5{amount}",
      "turn.tip": "\u672C\u8F6E\u5B9E\u9645 token \u6D88\u8017\u8D39\u7528\uFF08\u6309 DeepSeek \u5CF0\u8C37\u4EF7\u683C\u4F30\u7B97\uFF09",
      "tip.peak": "DeepSeek \u9AD8\u5CF0\u65F6\u6BB5\uFF08\u5317\u4EAC\u65F6\u95F4 09:00\u201312:00\u300114:00\u201318:00\uFF09\uFF0C\u6309\u9AD8\u5CF0\u4EF7\u8BA1\u8D39",
      "tip.offpeak": "DeepSeek \u95F2\u65F6\uFF1B\u5468\u516D\u3001\u5468\u65E5\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\u5168\u5929\u6309\u95F2\u65F6\u4EF7\u8BA1\u8D39",
      "tip.price": "\u8F93\u5165 {input} \u00B7 \u8F93\u51FA {output} \u00B7 \u7F13\u5B58\u547D\u4E2D {cacheHitInput} \uFF08\u5143/\u767E\u4E07 tokens\uFF09",
      "tip.other": "\u5F53\u524D\u6A21\u578B {model}\uFF08\u975E DeepSeek\uFF09\uFF0C\u6309\u8BE5\u6A21\u578B\u4EF7\u683C\u8BA1\u8D39\uFF08\u65E0\u5CF0\u8C37\uFF09",
      "tip.now": "\u5F53\u524D\u5317\u4EAC\u65F6\u95F4 {time}",
      "tip.next": "{countdown} \u540E\u5207\u6362\u8BA1\u4EF7\u65F6\u6BB5",
      "settings.compact.title": "\u6210\u672C\u4E0E\u4E0A\u4E0B\u6587",
      "settings.compact.enabled": "\u81EA\u52A8\u538B\u7F29\u957F\u4F1A\u8BDD",
      "settings.compact.budget": "\u89E6\u53D1\u9884\u7B97",
      "settings.compact.retain": "\u4FDD\u7559\u6700\u8FD1",
      "settings.compact.hint": "\u63A8\u8350 100k\uFF1A\u66F4\u4F4E\u9884\u7B97\u66F4\u7701\u94B1\uFF0C\u4F46\u65E7\u5BF9\u8BDD\u4F1A\u66F4\u591A\u4F9D\u8D56\u6458\u8981\u3002"
    };
    var enPeak = {
      "badge.peak": "\u26A1 Peak",
      "badge.offpeak": "\u{1F4A4} Off-peak",
      "badge.other": "\u{1F33F} Other",
      "badge.next": " \u00B7 switches in {countdown}",
      "badge.cost": " \u00B7 \u00A5{amount} session",
      "turn.cost": "Turn \u00A5{amount}",
      "turn.tip": "Actual token cost for this turn (estimated at DeepSeek peak/off-peak rates)",
      "tip.peak": "DeepSeek peak hours (Beijing 09:00\u201312:00, 14:00\u201318:00); peak rates apply",
      "tip.offpeak": "DeepSeek off-peak; all Saturday and Sunday hours (Beijing time) use off-peak rates",
      "tip.price": "Input {input} \u00B7 Output {output} \u00B7 Cache hit {cacheHitInput} (CNY per 1M tokens)",
      "tip.other": "Model {model} (non-DeepSeek) \u00B7 billed at this model's flat rates (no peak/off-peak)",
      "tip.now": "Beijing time {time}",
      "tip.next": "billing window switches in {countdown}",
      "settings.compact.title": "Cost & context",
      "settings.compact.enabled": "Auto-compact long sessions",
      "settings.compact.budget": "Trigger budget",
      "settings.compact.retain": "Retain recent",
      "settings.compact.hint": "100k is recommended; lower budgets save more but rely more on summaries."
    };

    // ---- balance dictionaries (dsh-balance-indicator) ------------------------
    var zhBalance = {
      // Same unit and precision as the price chip: CNY, ¥, two decimals.
      "balance.chip": "\u4F59\u989D \u00A5{amount}",
      "balance.pending": "\u4F59\u989D \u2026",
      "balance.unknown": "\u4F59\u989D \u2014",
      // The header pill merges the session spend and the balance total with a
      // middle dot: "本会话 ¥0.94 · 余额 ¥29.33".
      "header.spent": "\u672C\u4F1A\u8BDD \u00A5{amount}",
      "header.spent.tip": "\u672C\u4F1A\u8BDD\u7D2F\u8BA1 token \u8D39\u7528\uFF08\u6309 DeepSeek \u5CF0\u8C37\u4EF7\u683C\u4F30\u7B97\uFF09",
      "header.separator": " \u00B7 ",
      "balance.tip": "DeepSeek API Key \u4F59\u989D\uFF08\u5B98\u65B9 user/balance \u63A5\u53E3\uFF09",
      "balance.detail": "\u603B\u4F59\u989D \u00A5{total} \u00B7 \u8D60\u9001 \u00A5{granted} \u00B7 \u5145\u503C \u00A5{toppedUp}",
      "balance.available": "\u8D26\u6237\u53EF\u7528",
      "balance.unavailable": "\u8D26\u6237\u4E0D\u53EF\u7528",
      "balance.source": "\u6765\u6E90 {source}",
      "balance.updated": "\u66F4\u65B0\u4E8E {time}",
      "balance.stale": "\u5F53\u524D\u663E\u793A\u4E0A\u4E00\u6B21\u6210\u529F\u8BFB\u53D6\u7684\u4F59\u989D",
      "balance.low": "\u4F59\u989D\u4F4E\u4E8E \u00A5{threshold}",
      "balance.error": "\u8BFB\u53D6\u5931\u8D25\uFF1A{error}",
      "balance.refresh": "\u6BCF\u5206\u949F\u81EA\u52A8\u5237\u65B0"
    };
    var enBalance = {
      "balance.chip": "Balance \u00A5{amount}",
      "balance.pending": "Balance \u2026",
      "balance.unknown": "Balance \u2014",
      "header.spent": "Spent \u00A5{amount}",
      "header.spent.tip": "Token spend for this session (estimated at DeepSeek peak/off-peak rates)",
      "header.separator": " \u00B7 ",
      "balance.tip": "DeepSeek API key balance (official user/balance endpoint)",
      "balance.detail": "Total \u00A5{total} \u00B7 Granted \u00A5{granted} \u00B7 Topped up \u00A5{toppedUp}",
      "balance.available": "Key usable",
      "balance.unavailable": "Key not usable",
      "balance.source": "source {source}",
      "balance.updated": "updated {time}",
      "balance.stale": "showing the last successful reading",
      "balance.low": "below \u00A5{threshold}",
      "balance.error": "read failed: {error}",
      "balance.refresh": "refreshes every minute"
    };

    // ---- colour overlay dictionaries (shared by both namespaces) -------------
    var zhColors = {
      "colors.title": "\u80F6\u56CA\u914D\u8272",
      "colors.text": "\u6587\u5B57\u8272",
      "colors.border": "\u8FB9\u6846\u8272",
      "colors.background": "\u80CC\u666F\u8272",
      "colors.value": "\u660E\u5EA6",
      "colors.mode.all": "\u6574\u4F53",
      "colors.mode.single": "\u5355\u4E2A",
      "colors.mode.hint.all": "\u6B63\u5728\u8C03\u6574\u56DB\u4E2A\u80F6\u56CA\u7684\u6574\u4F53\u914D\u8272",
      "colors.mode.hint.single": "\u6B63\u5728\u8C03\u6574\u5F53\u524D\u8FD9\u4E00\u4E2A\u80F6\u56CA",
      "colors.reset.one": "\u6062\u590D\u9ED8\u8BA4",
      "colors.reset.all": "\u5168\u90E8\u91CD\u7F6E",
      "colors.save": "\u4FDD\u5B58",
      "colors.save.tip": "\u914D\u8272\u4F1A\u81EA\u52A8\u4FDD\u5B58\uFF1B\u70B9\u6B64\u7ACB\u5373\u5199\u5165 ~/.dsh/settings.yaml",
      "colors.save.saved": "\u5DF2\u4FDD\u5B58",
      "colors.save.saving": "\u4FDD\u5B58\u4E2D\u2026",
      "colors.save.local": "\u5DF2\u5B58\u672C\u673A\uFF08\u4E3B\u673A\u672A\u63A5\u53D7\uFF0C\u91CD\u542F DSH \u540E\u5C31\u4F1A\u5199\u5165\u914D\u7F6E\uFF09",
      "colors.save.error": "\u4FDD\u5B58\u5931\u8D25\uFF1A{error}",
      "colors.hint": "\u81EA\u5B9A\u4E49\u540E\u8BE5\u80F6\u56CA\u6240\u6709\u72B6\u6001\uFF08\u5CF0\u8C37\u3001\u4F4E\u4F59\u989D\u3001\u9519\u8BEF\uFF09\u90FD\u7528\u8FD9\u5957\u989C\u8272",
      "colors.preview": "\u9884\u89C8",
      "colors.topup": "\u5145\u503C",
      "colors.topup.tip": "\u6253\u5F00 DeepSeek \u5B98\u65B9\u5145\u503C\u9875\u9762\uFF08platform.deepseek.com/top_up\uFF09",
      "colors.preset": "\u9884\u8BBE",
      "colors.preset.default": "\u9ED8\u8BA4",
      "colors.preset.default.tip": "\u4FDD\u7559\u63D2\u4EF6\u81EA\u5E26\u914D\u8272\uFF1A\u5CF0\u8C37\u7EFF/\u7EA2\u3001\u4F59\u989D\u4F4E\u4E8E\u9608\u503C\u53D8\u7EA2\u3001\u8BFB\u4E0D\u5230\u53D8\u7070",
      "colors.preset.dark": "\u6DF1\u8272",
      "colors.preset.dark.tip": "\u4E0E\u6DF1\u8272\u6A21\u5F0F\u4E00\u81F4\u7684\u914D\u8272\uFF08Catppuccin Frapp\u00E9 \u9762\u677F\u8272 #414559\uFF09",
      "colors.preset.light": "\u6D45\u767D",
      "colors.preset.light.tip": "\u4E0E\u6D45\u8272\u6A21\u5F0F\u4E00\u81F4\u7684\u914D\u8272\uFF08Catppuccin Latte \u9762\u677F\u8272 #EFF1F5\uFF09",
      "colors.pill.peak": "\u5934\u90E8\u65F6\u6BB5",
      "colors.pill.headerBalance": "\u5934\u90E8\u82B1\u8D39\u00B7\u4F59\u989D",
      "colors.pill.turnCost": "\u672C\u8F6E\u8D39\u7528",
      "colors.pill.turnBalance": "\u672C\u8F6E\u4F59\u989D"
    };
    var enColors = {
      "colors.title": "Pill colours",
      "colors.text": "Text",
      "colors.border": "Border",
      "colors.background": "Fill",
      "colors.value": "Value",
      "colors.mode.all": "All four",
      "colors.mode.single": "This one",
      "colors.mode.hint.all": "Editing all four pills at once",
      "colors.mode.hint.single": "Editing only this pill",
      "colors.reset.one": "Reset",
      "colors.reset.all": "Reset all",
      "colors.save": "Save",
      "colors.save.tip": "Colours save automatically; click to write ~/.dsh/settings.yaml right now",
      "colors.save.saved": "Saved",
      "colors.save.saving": "Saving\u2026",
      "colors.save.local": "Kept on this browser only (host refused; a DSH restart makes it stick)",
      "colors.save.error": "Save failed: {error}",
      "colors.hint": "A custom colour overrides every state (peak, low balance, error)",
      "colors.preview": "Preview",
      "colors.topup": "Top up",
      "colors.topup.tip": "Open the official DeepSeek top-up page (platform.deepseek.com/top_up)",
      "colors.preset": "Preset",
      "colors.preset.default": "Default",
      "colors.preset.default.tip": "Keep the plugin's own palette: peak green/red, red below the low-balance threshold, grey when unreadable",
      "colors.preset.dark": "Dark",
      "colors.preset.dark.tip": "Matches dark mode (Catppuccin Frappe surface #414559)",
      "colors.preset.light": "Light",
      "colors.preset.light.tip": "Matches light mode (Catppuccin Latte surface #EFF1F5)",
      "colors.pill.peak": "Header period",
      "colors.pill.headerBalance": "Header cost & balance",
      "colors.pill.turnCost": "Turn cost",
      "colors.pill.turnBalance": "Turn balance"
    };

    /** Merge the shared overlay strings into both pill namespaces. */
    var zh = { ...zhPeak, ...zhColors };
    var en = { ...enPeak, ...enColors };
    var zhBalanceFull = { ...zhBalance, ...zhColors };
    var enBalanceFull = { ...enBalance, ...enColors };

    // ========================================================================
    // Peak/off-peak + session cost (dsh-peak-indicator)
    // ========================================================================

    /** Peak windows, Beijing hours (start inclusive, end exclusive). */
    var PEAK_WINDOWS = [[9, 12], [14, 18]];
    /** Beijing is UTC+8, no DST. */
    var BEIJING_OFFSET_MINUTES = 8 * 60;
    var WEEKEND_OFFPEAK_EFFECTIVE_AT = Date.parse("2026-08-23T00:00:00+08:00");

    /**
     * Whether the peak/off-peak scheme applies to the given selection: only
     * DeepSeek flash/pro models are billed under the DeepSeek peak/off-peak
     * pricing, so the badge stays hidden for every other model.
     */
    function isDeepseekModel(provider, model) {
      const p = String(provider ?? "").toLowerCase();
      const m = String(model ?? "").toLowerCase();
      return p.includes("deepseek") && (m.includes("flash") || m.includes("pro"));
    }

    /**
     * Peak prices per 1M tokens (CNY) from the DeepSeek official price list
     * (https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ ; values as of
     * the 2026-09-10 12:00 Beijing adjustment). Off-peak prices are exactly
     * half. Update this table when DeepSeek changes its price list.
     */
    var MODEL_PRICES = {
      "deepseek-v4-flash": { input: 2, output: 8, cacheHitInput: 0.04 },
      "deepseek-v4-pro": { input: 9, output: 27, cacheHitInput: 0.3 }
    };
    /**
     * Approximate flat prices per 1M tokens (CNY) for common non-DeepSeek
     * models (no peak/off-peak applies). Best-effort public rates; override
     * via the plugin config `prices`.
     */
    var OTHER_MODEL_PRICES = {
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
    /** Off-peak price ratio vs. peak (official: idle hours cost half of peak). */
    var OFF_PEAK_FACTOR = 0.5;

    /**
     * Resolve the current token prices for a model during a billing period.
     * DeepSeek flash/pro models follow the peak/off-peak table; every other
     * model uses its flat price (period ignored).
     * @returns input/output/cache-hit prices per 1M tokens, or null when the
     * model has no known price entry.
     */
    function modelPrices(model, period) {
      const m = String(model ?? "").toLowerCase();
      const isDS = m.includes("deepseek") && (m.includes("flash") || m.includes("pro"));
      let table = isDS ? MODEL_PRICES : { ...OTHER_MODEL_PRICES };
      let peak = table[m];
      if (peak === void 0) {
        const keys = Object.keys(table).sort((a, b) => b.length - a.length);
        for (const key of keys) {
          if (m.startsWith(key)) { peak = table[key]; break; }
        }
      }
      if (peak === void 0) return null;
      if (!isDS) {
        return { input: peak.input, output: peak.output, cacheHitInput: peak.cacheHitInput };
      }
      const factor = period === "offpeak" ? OFF_PEAK_FACTOR : 1;
      return {
        input: peak.input * factor,
        output: peak.output * factor,
        cacheHitInput: peak.cacheHitInput * factor
      };
    }

    /** Trim trailing zeros for display (1.5 -> "1.5", 3 -> "3", 0.05 -> "0.05"). */
    function formatPrice(value) {
      return String(Math.round(value * 1e4) / 1e4);
    }

    /** Minutes since Beijing midnight for `now`. */
    function beijingMinutes(now) {
      return (now.getUTCHours() * 60 + now.getUTCMinutes() + BEIJING_OFFSET_MINUTES) % 1440;
    }

    function beijingDay(now) {
      return new Date(now.getTime() + BEIJING_OFFSET_MINUTES * 60 * 1000).getUTCDay();
    }

    /** Current billing period: "peak" | "offpeak". */
    function currentPeriod(now) {
      const value = now ?? new Date();
      if (value.getTime() >= WEEKEND_OFFPEAK_EFFECTIVE_AT) {
        const day = beijingDay(value);
        if (day === 0 || day === 6) return "offpeak";
      }
      const bj = beijingMinutes(value);
      return PEAK_WINDOWS.some(([startHour, endHour]) => bj >= startHour * 60 && bj < endHour * 60) ? "peak" : "offpeak";
    }

    /** Minutes until the next peak/off-peak transition (1..1440). */
    function nextTransitionInMinutes(now) {
      const value = now ?? new Date();
      const bj = beijingMinutes(value);
      const day = beijingDay(value);
      if (value.getTime() >= WEEKEND_OFFPEAK_EFFECTIVE_AT && (day === 0 || day === 6)) {
        const daysUntilMonday = day === 6 ? 2 : 1;
        return daysUntilMonday * 1440 - bj + 9 * 60;
      }
      const boundaries = [];
      for (const [startHour, endHour] of PEAK_WINDOWS) boundaries.push(startHour * 60, endHour * 60);
      boundaries.sort((a, b) => a - b);
      for (const boundary of boundaries) if (boundary > bj) return boundary - bj;
      return (value.getTime() >= WEEKEND_OFFPEAK_EFFECTIVE_AT && day === 5 ? 3 : 1) * 1440 - bj + boundaries[0];
    }

    /** Beijing wall clock "HH:MM" for `now`. */
    function formatBeijingClock(now) {
      const bj = beijingMinutes(now);
      return `${String(Math.floor(bj / 60)).padStart(2, "0")}:${String(bj % 60).padStart(2, "0")}`;
    }

    /** Human countdown like "1 小时 12 分钟". */
    function formatCountdown(minutes) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return hours === 0 ? `${rest} 分钟` : `${hours} 小时 ${rest} 分钟`;
    }

    /** No-op store faces for the "directory not available yet" case. */
    var noopSubscribe = () => () => {};
    var noopSnapshot = () => null;

    // ========================================================================
    // DeepSeek key balance (dsh-balance-indicator)
    // ========================================================================

    /** Authenticated host route owned by this plugin's host half. */
    var BALANCE_ENDPOINT = "/api/deepseek.balance";
    /** Poll cadence while at least one pill is mounted. */
    var REFRESH_MS = 60000;
    /** Skip the mount read when the store answered this recently. */
    var FRESH_MS = 15000;

    /** Same amount formatting as the price chip (`¥0.08`). */
    function formatAmount(value) {
      return (typeof value === "number" && Number.isFinite(value) ? value : 0).toFixed(2);
    }

    /** Beijing wall clock "HH:MM:SS" for a Unix-millisecond timestamp. */
    function formatClock(timeMs) {
      if (typeof timeMs !== "number" || !Number.isFinite(timeMs)) return "--:--:--";
      const shifted = new Date(timeMs + 8 * 60 * 60 * 1000);
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    }

    /**
     * One shared balance store for every mounted pill: React reads it through
     * useSyncExternalStore, and the whole page polls at most once per minute
     * regardless of how many turns or headers are on screen.
     */
    var INITIAL_STATE = Object.freeze({ status: "idle", data: null, error: null });
    var state = INITIAL_STATE;
    var listeners = /* @__PURE__ */ new Set();
    var timer = null;
    var inflight = null;
    var lastReadAt = 0;

    function getSnapshot() {
      return state;
    }

    function publish(next) {
      if (next === state) return;
      state = next;
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch {
          // One broken subscriber must not stop the others.
        }
      }
    }

    /** Read the host route once; concurrent callers share one request. */
    function refresh(force) {
      if (inflight !== null) return inflight;
      const doFetch = globalThis.fetch;
      if (typeof doFetch !== "function") {
        publish({ status: "error", data: null, error: "fetch unavailable" });
        return Promise.resolve();
      }
      inflight = doFetch(`${BALANCE_ENDPOINT}${force === true ? "?force=1" : ""}`, {
        credentials: "same-origin",
        headers: { accept: "application/json" }
      }).then((response) => response.json().then((payload) => ({ status: response.status, payload }))).then(({ status, payload }) => {
        lastReadAt = Date.now();
        const body = typeof payload === "object" && payload !== null ? payload : {};
        if (body.ok === true) {
          publish({ status: "ready", data: body, error: typeof body.error === "string" ? body.error : null });
          return;
        }
        publish({ status: "error", data: null, error: typeof body.error === "string" ? body.error : `HTTP ${status}` });
      }).catch((error) => {
        lastReadAt = Date.now();
        publish({ status: "error", data: null, error: error?.message ?? String(error) });
      }).finally(() => {
        inflight = null;
      });
      return inflight;
    }

    /** Stop the shared poll timer (plugin unload, or the last pill unmounting). */
    function stopPolling() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    }

    var balanceStore = {
      subscribe(listener) {
        listeners.add(listener);
        if (timer === null) {
          timer = setInterval(() => refresh(true), REFRESH_MS);
          if (Date.now() - lastReadAt > FRESH_MS) refresh(false);
        }
        return () => {
          listeners.delete(listener);
          if (listeners.size === 0) stopPolling();
        };
      },
      getSnapshot,
      getServerSnapshot: getSnapshot,
      refresh,
      stopPolling
    };

    // ========================================================================
    // Colour customisation
    // ========================================================================

    /** The four pills a user can recolour. */
    var PILL_KEYS = ["peak", "headerBalance", "turnCost", "turnBalance"];
    /** The three recolourable properties of a pill. */
    var COLOR_TARGETS = ["text", "border", "background"];
    /** Default (built-in) palettes, mirroring the token price chip. */
    var DEFAULT_PILL_COLORS = Object.freeze({
      // off-peak / neutral: the price chip's own green pill
      neutral: Object.freeze({ text: "#0f7b3d", border: "#7fd6a8", background: "#d9f2e2" }),
      // peak / low balance / warning: the price chip's own red pill
      alert: Object.freeze({ text: "#ffffff", border: "#e5484d", background: "#e5484d" }),
      // could not read it: same geometry, muted
      muted: Object.freeze({ text: "#667085", border: "#d0d5dd", background: "#eef0f2" })
    });
    /** One empty per-pill colour entry; an empty field means "use the default". */
    function emptyPillColor() {
      return { text: "", border: "", background: "" };
    }
    /**
     * The colour presets offered in the overlay.
     *
     * `default` carries no colours at all: it is the built-in palette, where every
     * pill still switches with its own state (peak red / off-peak green, muted
     * grey while the balance cannot be read). It is exactly what the reset
     * buttons have always done.
     *
     * `dark` and `light` are the two surfaces of the active skin (catppuccin
     * Frappé for dark, Latte for light) read from the theme's own tokens:
     * background = the theme's raised surface, text = the theme's primary label,
     * border = the theme's surface border. They stay plain hexes, so the wheel can
     * keep editing them afterwards.
     */
    var PILL_PRESETS = [
      { id: "default", colors: null },
      { id: "dark", colors: { text: "#C6D0F5", border: "#626880", background: "#414559" } },
      { id: "light", colors: { text: "#4C4F69", border: "#BCC0CC", background: "#EFF1F5" } }
    ];
    /** How long the pointer must rest on a pill before the overlay opens. */
    var HOVER_OPEN_MS = 500;
    /** How long the overlay survives a pointer that left pill and overlay. */
    var HOVER_CLOSE_MS = 240;
    /** Settings defaults for the colour section. */
    function defaultColorSettings() {
      const colors = { mode: "all", all: emptyPillColor() };
      for (const key of PILL_KEYS) colors[key] = emptyPillColor();
      return colors;
    }
    /** The preset whose colours the given scope currently shows, if any. */
    function activePresetId(colors, scopeKey) {
      const entry = colors?.[scopeKey] ?? emptyPillColor();
      for (const preset of PILL_PRESETS) {
        if (preset.colors === null) {
          // "Default" is active only while nothing anywhere is customised.
          const custom = PILL_KEYS.some((key) => {
            const pill = colors?.[key] ?? emptyPillColor();
            return pill.text !== "" || pill.border !== "" || pill.background !== "";
          });
          const global = colors?.all ?? emptyPillColor();
          if (!custom && global.text === "" && global.border === "" && global.background === "") return preset.id;
          continue;
        }
        if (entry.text === preset.colors.text && entry.border === preset.colors.border && entry.background === preset.colors.background) return preset.id;
      }
      return null;
    }

    /** Clamp a channel to 0..255. */
    function clampChannel(value) {
      return Math.max(0, Math.min(255, Math.round(value)));
    }

    /** "#rgb" / "#rrggbb" -> { r, g, b }, or null when unparsable. */
    function hexToRgb(value) {
      const text = String(value ?? "").trim();
      if (!/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(text)) return null;
      let hex = text.startsWith("#") ? text.slice(1) : text;
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    /** { r, g, b } -> "#RRGGBB". */
    function rgbToHex({ r, g, b }) {
      const hex = (value) => clampChannel(value).toString(16).padStart(2, "0").toUpperCase();
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    }

    /** { r, g, b } -> { h: 0..360, s: 0..1, v: 0..1 }. */
    function rgbToHsv({ r, g, b }) {
      const rn = clampChannel(r) / 255;
      const gn = clampChannel(g) / 255;
      const bn = clampChannel(b) / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const delta = max - min;
      let hue = 0;
      if (delta !== 0) {
        if (max === rn) hue = ((gn - bn) / delta) % 6;
        else if (max === gn) hue = (bn - rn) / delta + 2;
        else hue = (rn - gn) / delta + 4;
        hue *= 60;
        if (hue < 0) hue += 360;
      }
      return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
    }

    /** { h: 0..360, s: 0..1, v: 0..1 } -> { r, g, b }. */
    function hsvToRgb({ h, s, v }) {
      const hue = ((h % 360) + 360) % 360;
      const sat = Math.max(0, Math.min(1, s));
      const val = Math.max(0, Math.min(1, v));
      const c = val * sat;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = val - c;
      let rgb;
      if (hue < 60) rgb = [c, x, 0];
      else if (hue < 120) rgb = [x, c, 0];
      else if (hue < 180) rgb = [0, c, x];
      else if (hue < 240) rgb = [0, x, c];
      else if (hue < 300) rgb = [x, 0, c];
      else rgb = [c, 0, x];
      return {
        r: Math.round((rgb[0] + m) * 255),
        g: Math.round((rgb[1] + m) * 255),
        b: Math.round((rgb[2] + m) * 255)
      };
    }

    /** Accept only a settable colour string; anything else becomes "". */
    function cleanColor(value) {
      return typeof value === "string" && hexToRgb(value) !== null ? rgbToHex(hexToRgb(value)) : "";
    }

    /**
     * Normalize a `pillColors` settings value into the shape the pills read.
     * Unknown pills and unparsable colours are dropped rather than trusted.
     */
    function normalizeColorSettings(value) {
      const source = typeof value === "object" && value !== null ? value : {};
      const readEntry = (entry) => {
        const raw = typeof entry === "object" && entry !== null ? entry : {};
        const cleaned = emptyPillColor();
        for (const target of COLOR_TARGETS) cleaned[target] = cleanColor(raw[target]);
        return cleaned;
      };
      const colors = {
        mode: source.mode === "single" ? "single" : "all",
        all: readEntry(source.all)
      };
      for (const key of PILL_KEYS) colors[key] = readEntry(source[key]);
      return colors;
    }

    /**
     * Resolve the colours of one pill: its own custom fields win, then the
     * global ("all four") entry, then the built-in state palette.
     */
    function resolvePillColors(settings, pillKey, builtIn) {
      const per = settings?.[pillKey] ?? emptyPillColor();
      const all = settings?.all ?? emptyPillColor();
      return {
        text: per.text || all.text || builtIn.text,
        border: per.border || all.border || builtIn.border,
        background: per.background || all.background || builtIn.background
      };
    }

    /** Pill geometry shared by every state, matching the price chip exactly. */
    function pillStyle(colors) {
      return {
        whiteSpace: "nowrap",
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: "18px",
        padding: "1px 8px",
        borderRadius: 999,
        color: colors.text,
        background: colors.background,
        border: `1px solid ${colors.border}`,
        fontVariantNumeric: "tabular-nums"
      };
    }

    /**
     * The colour settings store. It mirrors the host-side `pillColors` settings
     * through the plugin's settings scope so the choice survives restarts, keeps
     * an optimistic local value while the user drags (so the pills recolour
     * instantly), and debounces the write-behind to one settings write per
     * gesture.
     *
     * It also keeps a copy in the browser's own storage on every edit. That copy
     * is what makes the palette survive a page reload even when the HOST refuses
     * the write — the case that made colours snap back to the default preset —
     * and it is dropped again as soon as a host write succeeds, so the settings
     * document stays the single source of truth once the host accepts it.
     */
    var colorState = { mode: "all", colors: defaultColorSettings(), save: { status: "idle", message: "" } };
    var colorListeners = /* @__PURE__ */ new Set();
    var colorScope = null;
    var colorPersistTimer = null;
    var colorSaveClearTimer = null;
    /** Browser-storage key of the reload-proof copy. */
    var COLOR_STORAGE_KEY = "dsh-cost-balance-indicator.pillColors";

    function colorSnapshot() {
      return colorState;
    }

    function notifyColors(next) {
      colorState = next;
      for (const listener of [...colorListeners]) {
        try {
          listener();
        } catch {
          // One broken subscriber must not stop the others.
        }
      }
    }

    /** True when any pill or the global scope carries a custom colour. */
    function hasAnyCustomColor(colors) {
      const scopes = ["all", ...PILL_KEYS];
      return scopes.some((key) => {
        const entry = colors?.[key];
        return typeof entry === "object" && entry !== null && (entry.text !== "" || entry.border !== "" || entry.background !== "");
      });
    }

    function readLocalColors() {
      try {
        const raw = globalThis.localStorage?.getItem(COLOR_STORAGE_KEY);
        if (typeof raw !== "string" || raw.length === 0) return null;
        const colors = normalizeColorSettings(JSON.parse(raw));
        return hasAnyCustomColor(colors) ? colors : null;
      } catch {
        return null;
      }
    }

    function writeLocalColors(colors) {
      try {
        if (hasAnyCustomColor(colors)) globalThis.localStorage?.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
        else globalThis.localStorage?.removeItem(COLOR_STORAGE_KEY);
      } catch {
        // Private mode / storage disabled: the host copy is still attempted.
      }
    }

    function dropLocalColors() {
      try {
        globalThis.localStorage?.removeItem(COLOR_STORAGE_KEY);
      } catch {
        // Nothing to drop.
      }
    }

    /** Publish a save status, clearing a stale "saved" tick after a moment. */
    function setSaveStatus(status, message) {
      if (colorSaveClearTimer !== null) {
        clearTimeout(colorSaveClearTimer);
        colorSaveClearTimer = null;
      }
      notifyColors({ ...colorState, save: { status, message: message ?? "" } });
      if (status === "saved") {
        colorSaveClearTimer = setTimeout(() => {
          colorSaveClearTimer = null;
          if (colorState.save.status === "saved") notifyColors({ ...colorState, save: { status: "idle", message: "" } });
        }, 2000);
      }
    }

    /** Read the mode + colours out of a settings-scope snapshot. */
    function readSettingsSnapshot(snapshot) {
      return normalizeColorSettings(snapshot?.value?.pillColors);
    }

    /**
     * Resolve the write path this client build actually offers for one field of
     * the namespace. Current builds expose `set(field, value)` (and the atomic
     * `mutate(ops)`); the `write({ op, path, value })` shape some older plugins
     * call does not exist, which is exactly how a colour edit used to look saved
     * and then vanish — the call was never made.
     * @returns a writer for the field, or null when this scope cannot write.
     */
    function settingsWriter(scope, field) {
      if (scope === null || scope === void 0) return null;
      if (typeof scope.set === "function") return (value) => scope.set(field, value);
      if (typeof scope.mutate === "function") return (value) => scope.mutate([{ op: "set", path: [field], value }]);
      if (typeof scope.write === "function") return (value) => scope.write({ op: "set", path: [field], value });
      return null;
    }

    /**
     * Write the current palette to the host settings document. Called by the
     * debounce and by the overlay's explicit save button; a refusal keeps the
     * browser copy and reports itself instead of failing silently.
     */
    function persistColors() {
      if (colorPersistTimer !== null) {
        clearTimeout(colorPersistTimer);
        colorPersistTimer = null;
      }
      const attempted = colorState.colors;
      const writer = settingsWriter(colorScope, "pillColors");
      const writable = colorScope === null || typeof colorScope.getSnapshot !== "function"
        ? writer !== null
        : colorScope.getSnapshot()?.writable !== false;
      if (writer === null || writable === false) {
        // No usable write path (or the connection keeps preferences
        // process-local): the browser copy is all we have.
        writeLocalColors(attempted);
        setSaveStatus(hasAnyCustomColor(attempted) ? "local" : "idle", "");
        return Promise.resolve(false);
      }
      setSaveStatus("saving", "");
      return Promise.resolve(writer(attempted)).then(
        () => {
          if (colorState.colors === attempted) {
            dropLocalColors();
            setSaveStatus("saved", "");
          }
          return true;
        },
        (error) => {
          writeLocalColors(attempted);
          if (colorState.colors === attempted) setSaveStatus("error", String(error?.message ?? error));
          return false;
        }
      );
    }

    function schedulePersist() {
      if (colorPersistTimer !== null) clearTimeout(colorPersistTimer);
      colorPersistTimer = setTimeout(persistColors, 300);
    }

    /** Apply a locally edited section: pills update now, the copies follow. */
    function commitColors(colors, immediate) {
      notifyColors({ ...colorState, mode: colors.mode, colors });
      // The browser copy is synchronous, so a reload never loses an edit even
      // while the host write is still in flight or was refused.
      writeLocalColors(colors);
      if (immediate === true) persistColors();
      else schedulePersist();
    }

    var colorStore = {
      /** Attach the plugin's settings scope as the persistence backend. */
      bindScope(scope) {
        colorScope = scope;
        if (scope === null || typeof scope.subscribe !== "function") return;
        const apply = () => {
          // A pending local edit wins until it has been written out.
          if (colorPersistTimer !== null) return;
          const next = readSettingsSnapshot(scope.getSnapshot());
          if (hasAnyCustomColor(next)) {
            dropLocalColors();
            notifyColors({ ...colorState, mode: next.mode, colors: next });
            return;
          }
          // The host has nothing: fall back to this browser's own copy, which is
          // exactly the palette the user picked before reloading.
          const local = readLocalColors();
          if (local !== null) {
            notifyColors({ ...colorState, mode: local.mode, colors: local, save: { status: "local", message: "" } });
            return;
          }
          notifyColors({ ...colorState, mode: next.mode, colors: next });
        };
        apply();
        scope.subscribe(apply);
      },
      subscribe(listener) {
        colorListeners.add(listener);
        return () => {
          colorListeners.delete(listener);
        };
      },
      getSnapshot: colorSnapshot,
      getServerSnapshot: colorSnapshot,
      /** Write the palette to the host right now (the overlay's save button). */
      saveNow() {
        return persistColors();
      },
      /** Set one field of one scope ("all" or a pill key). */
      setColor(scopeKey, target, value) {
        const colors = { ...colorState.colors };
        colors[scopeKey] = { ...(colors[scopeKey] ?? emptyPillColor()), [target]: cleanColor(value) };
        commitColors(colors, false);
        return colors;
      },
      /** Switch the mode slider; the mode itself is persisted too. */
      setMode(mode) {
        const colors = { ...colorState.colors, mode: mode === "single" ? "single" : "all" };
        commitColors(colors, true);
      },
      /** Clear one scope's custom colours (the pill falls back to the default). */
      resetScope(scopeKey) {
        const colors = { ...colorState.colors, [scopeKey]: emptyPillColor() };
        commitColors(colors, true);
      },
      /** Clear every custom colour of all four pills. */
      resetAll() {
        commitColors({ ...defaultColorSettings(), mode: colorState.colors.mode }, true);
      },
      /**
       * Apply one preset to a scope. `default` clears that scope, the two themed
       * presets write their three colours into it.
       */
      applyPreset(scopeKey, presetId) {
        const preset = PILL_PRESETS.find((entry) => entry.id === presetId);
        const colors = { ...colorState.colors };
        colors[scopeKey] = preset === void 0 || preset.colors === null ? emptyPillColor() : { ...preset.colors };
        commitColors(colors, true);
        return colors;
      },
      /** The preset id the given scope currently matches, or null. */
      activePreset(scopeKey) {
        return activePresetId(colorState.colors, scopeKey);
      },
      /** Test/teardown helper: flush a debounced write immediately. */
      flush: persistColors
    };

    /** Theme-aware overlay chrome; every colour comes from the active skin. */
    var OVERLAY = {
      background: "var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base, #1b1f2a))",
      color: "var(--dsw-alias-label-primary, #f2f4f8)",
      border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))",
      secondary: "var(--dsw-alias-label-secondary, #b6bcc8)",
      tertiary: "var(--dsw-alias-label-tertiary, #8b93a1)",
      /** A raised surface inside the overlay (tabs, switch track, chips). */
      surface: "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.18))",
      hoverFill: "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.18))",
      accent: "var(--dsw-alias-brand-primary, #4f7cff)",
      /** Text drawn on top of `accent`; the skin defines this pair, so the
       *  selected segment can never collide with its own fill. */
      inverted: "var(--dsw-alias-label-primary-inverted, #ffffff)",
      shadow: "0 10px 30px rgba(0, 0, 0, 0.28)"
    };

    /** Official DeepSeek console page that tops an API key up. */
    var TOPUP_URL = "https://platform.deepseek.com/top_up";
    /** The wheel's outer diameter; the dot maths and the pointer maths share it. */
    var WHEEL_SIZE = 104;
    /** Width/height budget used to keep the overlay inside the viewport. */
    var OVERLAY_WIDTH = 340;
    var OVERLAY_HEIGHT = 344;

    /**
     * Place the overlay next to its pill: below by default, above when the
     * viewport has no room, always fully inside the window.
     */
    function overlayPosition(anchor) {
      const width = typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 1280;
      const height = typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 800;
      const left = Math.max(8, Math.min(anchor.left, width - OVERLAY_WIDTH - 8));
      const below = anchor.top + OVERLAY_HEIGHT;
      const top = below > height - 8 ? Math.max(8, anchor.top - OVERLAY_HEIGHT - 24) : anchor.top;
      return { top, left };
    }

    /** Hue/saturation at a pointer position inside the wheel element. */
    function wheelPoint(element, clientX, clientY) {
      const rect = element.getBoundingClientRect();
      const radius = Math.max(1, rect.width / 2);
      const dx = clientX - (rect.left + radius);
      const dy = clientY - (rect.top + radius);
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Screen angle 0 = +x (3 o'clock); the wheel's 0deg starts at 12 o'clock.
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      return {
        hue: (angle + 90) % 360,
        saturation: Math.max(0, Math.min(1, distance / radius))
      };
    }

    /** The wheel's own dot position for a hue/saturation pair. */
    function wheelDot(hue, saturation, size) {
      const radius = size / 2;
      const angle = ((hue - 90) * Math.PI) / 180;
      return {
        left: radius + Math.cos(angle) * radius * saturation,
        top: radius + Math.sin(angle) * radius * saturation
      };
    }

    /**
     * The interactive colour overlay: an RGB wheel plus value and channel
     * sliders for the active property (text, border or fill), a mode switch
     * choosing between "this one" (left) and "all four" (right, the default),
     * and the pill's own detail text so the old tooltip content is not lost.
     */
    function PillColorPanel({ t, pillKey, tip, anchor, resolved }) {
      const snapshot = import_react.default.useSyncExternalStore(
        colorStore.subscribe,
        colorStore.getSnapshot,
        colorStore.getServerSnapshot
      );
      const [target, setTarget] = import_react.default.useState("text");
      const wheelRef = import_react.default.useRef(null);
      const draggingRef = import_react.default.useRef(false);
      const settings = snapshot.colors;
      const mode = snapshot.mode;
      // The mode decides which scope the sliders write to.
      const scopeKey = mode === "single" ? pillKey : "all";
      /** Which preset the edited scope currently matches (for the highlight). */
      const activePreset = activePresetId(settings, scopeKey);
      /** Save feedback: "idle" | "saving" | "saved" | "local" | "error". */
      const saveStatus = snapshot.save?.status ?? "idle";
      const saveMessage = snapshot.save?.message ?? "";
      const current = resolved[target];
      const rgb = hexToRgb(current) ?? { r: 15, g: 123, b: 61 };
      const hsv = rgbToHsv(rgb);

      const write = (value) => colorStore.setColor(scopeKey, target, value);
      const writeRgb = (next) => write(rgbToHex(next));
      const applyWheel = (event) => {
        const element = wheelRef.current;
        if (element === null || element === void 0) return;
        const point = wheelPoint(element, event.clientX, event.clientY);
        writeRgb(hsvToRgb({ h: point.hue, s: point.saturation, v: hsv.v }));
      };
      const onWheelDown = (event) => {
        draggingRef.current = true;
        if (typeof event.currentTarget.setPointerCapture === "function") {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is best effort.
          }
        }
        applyWheel(event);
      };
      const onWheelMove = (event) => {
        if (draggingRef.current) applyWheel(event);
      };
      const onWheelUp = () => {
        draggingRef.current = false;
        colorStore.flush();
      };
      const dot = wheelDot(hsv.h, hsv.s, WHEEL_SIZE - 2);
      // Forward interpolation params: the save status carries the host's error.
      const label = (key, params) => t(key, params);
      const targetTabs = COLOR_TARGETS.map((name) => import_react.default.createElement("button", {
        key: name,
        type: "button",
        onClick: () => setTarget(name),
        style: {
          flex: 1,
          padding: "4px 6px",
          fontSize: 12,
          lineHeight: "16px",
          borderRadius: 6,
          cursor: "pointer",
          border: "1px solid transparent",
          color: target === name ? OVERLAY.color : OVERLAY.secondary,
          background: target === name ? OVERLAY.hoverFill : "transparent",
          fontWeight: target === name ? 600 : 400,
          transition: "color 160ms ease, background-color 160ms ease"
        }
      }, label(`colors.${name}`)));
      /**
       * One position of the mode switch. The coloured block behind the label is
       * the shared sliding knob (see below), so a segment only owns its text
       * colour: the selected one uses the skin's inverted-on-accent pair, which
       * is what stops the label from disappearing into the knob.
       */
      const modeButton = (value, key) => import_react.default.createElement("button", {
        key: value,
        type: "button",
        "data-cost-balance-mode": value,
        "aria-pressed": mode === value,
        onClick: () => colorStore.setMode(value),
        style: {
          position: "relative",
          zIndex: 1,
          flex: 1,
          padding: "4px 8px",
          fontSize: 12,
          lineHeight: "16px",
          borderRadius: 999,
          cursor: "pointer",
          border: "1px solid transparent",
          color: mode === value ? OVERLAY.inverted : OVERLAY.secondary,
          background: "transparent",
          fontWeight: mode === value ? 600 : 400,
          transition: "color 200ms ease"
        }
      }, label(key));
      const channelRow = (name, value, onInput, max) => import_react.default.createElement("label", {
        key: name,
        style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: OVERLAY.secondary, minWidth: 0 }
      },
        import_react.default.createElement("span", { style: { width: 34, flex: "none" } }, name === "value" ? label("colors.value") : name.toUpperCase()),
        import_react.default.createElement("input", {
          type: "range",
          min: 0,
          max,
          value: Math.round(value),
          onChange: (event) => onInput(Number(event.target.value)),
          // A range input carries an intrinsic minimum width, and a flex item's
          // default `min-width: auto` refuses to shrink below it: without this
          // the row overflows the overlay's right edge.
          style: { flex: "1 1 auto", minWidth: 0, width: "100%", accentColor: OVERLAY.accent, height: 16, cursor: "pointer" }
        }),
        import_react.default.createElement("span", {
          style: { width: 30, flex: "none", textAlign: "right", fontVariantNumeric: "tabular-nums" }
        }, String(Math.round(value))));
      /** Top-up shortcut, offered on the balance pill's overlay only. */
      const topupLink = pillKey === "headerBalance"
        ? import_react.default.createElement("a", {
            key: "topup",
            href: TOPUP_URL,
            target: "_blank",
            rel: "noreferrer noopener",
            title: label("colors.topup.tip"),
            style: {
              flex: "none",
              padding: "2px 8px",
              fontSize: 11,
              lineHeight: "16px",
              borderRadius: 999,
              textDecoration: "none",
              color: OVERLAY.color,
              background: OVERLAY.surface,
              border: OVERLAY.border
            }
          }, label("colors.topup"))
        : null;
      return import_react.default.createElement("div", {
        "data-cost-balance-colors": pillKey,
        style: {
          position: "fixed",
          top: anchor.top,
          left: anchor.left,
          zIndex: 10000,
          width: OVERLAY_WIDTH,
          boxSizing: "border-box",
          padding: "10px 12px 8px",
          background: OVERLAY.background,
          color: OVERLAY.color,
          border: OVERLAY.border,
          borderRadius: 12,
          boxShadow: OVERLAY.shadow,
          fontSize: 12,
          lineHeight: "18px"
        }
      },
        import_react.default.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }
        },
          import_react.default.createElement("span", { style: { fontWeight: 600 } }, label("colors.title")),
          import_react.default.createElement("span", { style: { color: OVERLAY.tertiary, flex: 1, minWidth: 0 } }, label(`colors.pill.${pillKey}`)),
          topupLink),
        import_react.default.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }
        },
          import_react.default.createElement("span", { style: { color: OVERLAY.secondary, fontSize: 11, flex: "none" } }, label("colors.preset")),
          import_react.default.createElement("div", {
            style: { display: "flex", flex: 1, gap: 4, background: OVERLAY.hoverFill, borderRadius: 8, padding: 2 }
          },
            PILL_PRESETS.map((preset) => import_react.default.createElement("button", {
              key: preset.id,
              type: "button",
              "data-cost-balance-preset": preset.id,
              "aria-pressed": activePreset === preset.id,
              title: label(`colors.preset.${preset.id}.tip`),
              onClick: () => colorStore.applyPreset(scopeKey, preset.id),
              style: {
                flex: 1,
                padding: "3px 6px",
                fontSize: 11,
                lineHeight: "16px",
                borderRadius: 6,
                cursor: "pointer",
                border: "1px solid transparent",
                color: activePreset === preset.id ? OVERLAY.color : OVERLAY.secondary,
                background: activePreset === preset.id ? OVERLAY.surface : "transparent",
                fontWeight: activePreset === preset.id ? 600 : 400,
                transition: "color 160ms ease, background-color 160ms ease"
              }
            }, label(`colors.preset.${preset.id}`))))),
        import_react.default.createElement("div", {
          style: { display: "flex", gap: 4, marginBottom: 8, background: OVERLAY.hoverFill, borderRadius: 8, padding: 2 }
        }, targetTabs),
        import_react.default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
          import_react.default.createElement("div", {
            ref: wheelRef,
            onPointerDown: onWheelDown,
            onPointerMove: onWheelMove,
            onPointerUp: onWheelUp,
            onPointerCancel: onWheelUp,
            style: {
              position: "relative",
              width: WHEEL_SIZE,
              height: WHEEL_SIZE,
              flex: "none",
              boxSizing: "border-box",
              borderRadius: "50%",
              // The skin sets `corner-shape: superellipse(1.5)` on `*`, which
              // turns every `border-radius: 50%` into a squircle. The wheel's
              // hue ring is a circle by construction, so the two must be forced
              // back into agreement here (the app's own dots and switch thumbs
              // opt out the same way).
              cornerShape: "round",
              overflow: "hidden",
              cursor: "crosshair",
              touchAction: "none",
              border: OVERLAY.border,
              // `backgroundImage`, not the `background` shorthand: a shorthand
              // resets every longhand it covers, so a `background` declared
              // after these two would silently put the clip back to border-box
              // and let the gradients bleed under the translucent border.
              backgroundClip: "padding-box",
              backgroundOrigin: "padding-box",
              backgroundImage: "radial-gradient(circle closest-side, #ffffff 0%, rgba(255,255,255,0) 100%), conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
            }
          },
            import_react.default.createElement("span", {
              style: {
                position: "absolute",
                left: dot.left - 6,
                top: dot.top - 6,
                width: 12,
                height: 12,
                borderRadius: "50%",
                // A round marker on a round wheel: same opt-out as the wheel.
                cornerShape: "round",
                border: "2px solid #ffffff",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
                background: current,
                pointerEvents: "none"
              }
            })),
          import_react.default.createElement("div", { style: { flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 } },
            channelRow("value", Math.round(hsv.v * 100), (next) => writeRgb(hsvToRgb({ h: hsv.h, s: hsv.s, v: next / 100 })), 100),
            channelRow("r", rgb.r, (next) => writeRgb({ ...rgb, r: next }), 255),
            channelRow("g", rgb.g, (next) => writeRgb({ ...rgb, g: next }), 255),
            channelRow("b", rgb.b, (next) => writeRgb({ ...rgb, b: next }), 255),
            import_react.default.createElement("div", {
              style: { display: "flex", alignItems: "center", gap: 6, marginTop: 2 }
            },
              import_react.default.createElement("span", {
                style: { width: 16, height: 16, borderRadius: 4, background: current, border: OVERLAY.border, flex: "none" }
              }),
              import_react.default.createElement("code", { style: { color: OVERLAY.secondary, fontSize: 11 } }, current)))),
        import_react.default.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 }
        },
          import_react.default.createElement("div", {
            style: { position: "relative", display: "flex", flex: 1, background: OVERLAY.surface, borderRadius: 999, padding: 2 }
          },
            // The sliding knob: one absolutely positioned block that animates
            // between the two positions, so switching reads as a slide rather
            // than a repaint. Left = this pill, right = all four (the default).
            import_react.default.createElement("span", {
              "data-cost-balance-mode-knob": mode,
              "aria-hidden": "true",
              style: {
                position: "absolute",
                top: 2,
                bottom: 2,
                left: 2,
                width: "calc(50% - 2px)",
                borderRadius: 999,
                background: OVERLAY.accent,
                pointerEvents: "none",
                transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                transform: mode === "all" ? "translateX(100%)" : "translateX(0)"
              }
            }),
            modeButton("single", "colors.mode.single"),
            modeButton("all", "colors.mode.all"))),
        import_react.default.createElement("div", {
          style: { color: OVERLAY.tertiary, fontSize: 11, marginTop: 6 }
        }, label(`colors.mode.hint.${mode}`)),
        import_react.default.createElement("div", {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 6 }
        },
          import_react.default.createElement("span", {
            style: { ...pillStyle(resolved), marginLeft: 0, fontSize: 12 }
          }, label("colors.preview")),
          // Explicit save: the palette is also written automatically, but this
          // makes the write immediate and reports whether the host took it.
          import_react.default.createElement("button", {
            type: "button",
            "data-cost-balance-save": "now",
            title: label("colors.save.tip"),
            onClick: () => { colorStore.saveNow(); },
            style: {
              marginLeft: "auto",
              padding: "2px 8px",
              fontSize: 11,
              borderRadius: 999,
              cursor: "pointer",
              color: saveStatus === "saved" ? OVERLAY.inverted : OVERLAY.color,
              background: saveStatus === "saved" ? OVERLAY.accent : OVERLAY.surface,
              border: OVERLAY.border
            }
          }, label(saveStatus === "saved" ? "colors.save.saved" : "colors.save")),
          import_react.default.createElement("button", {
            type: "button",
            onClick: () => colorStore.resetScope(scopeKey),
            style: {
              padding: "2px 8px",
              fontSize: 11,
              borderRadius: 999,
              cursor: "pointer",
              color: OVERLAY.secondary,
              background: "transparent",
              border: OVERLAY.border
            }
          }, label(mode === "single" ? "colors.reset.one" : "colors.reset.all"))),
        saveStatus === "idle"
          ? null
          : import_react.default.createElement("div", {
              "data-cost-balance-save-status": saveStatus,
              style: {
                fontSize: 11,
                marginTop: 6,
                color: saveStatus === "error" ? "#e5484d" : saveStatus === "saved" ? OVERLAY.color : OVERLAY.tertiary,
                whiteSpace: "normal"
              }
            }, saveStatus === "error"
              ? label("colors.save.error", { error: saveMessage })
              : saveStatus === "saving"
                ? label("colors.save.saving")
                : saveStatus === "local"
                  ? label("colors.save.local")
                  : label("colors.save.saved")),
        import_react.default.createElement("div", {
          style: { color: OVERLAY.tertiary, fontSize: 11, marginTop: 6, borderTop: OVERLAY.border, paddingTop: 6, whiteSpace: "normal" }
        }, tip));
    }

    /**
     * Wrap one pill: renders it with its resolved colours and opens the colour
     * overlay once the pointer has RESTED on it for `HOVER_OPEN_MS`. The delay is
     * hover intent: sweeping the pointer across the header or a turn row must not
     * throw the overlay open. The overlay is a descendant, so dragging inside it
     * keeps the surrounding hover-revealed row visible.
     */
    function ColorablePill({ t, pillKey, tip, builtIn, className, children }) {
      const snapshot = import_react.default.useSyncExternalStore(
        colorStore.subscribe,
        colorStore.getSnapshot,
        colorStore.getServerSnapshot
      );
      const [panel, setPanel] = import_react.default.useState(null);
      const openTimer = import_react.default.useRef(null);
      const closeTimer = import_react.default.useRef(null);
      const resolved = resolvePillColors(snapshot.colors, pillKey, builtIn);
      const cancelOpen = () => {
        if (openTimer.current !== null) {
          clearTimeout(openTimer.current);
          openTimer.current = null;
        }
      };
      const cancelClose = () => {
        if (closeTimer.current !== null) {
          clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
      };
      const openPanel = (event) => {
        cancelClose();
        const rect = event.currentTarget.getBoundingClientRect();
        const anchor = overlayPosition({ top: rect.bottom + 8, left: rect.left });
        if (openTimer.current !== null || panel !== null) return;
        openTimer.current = setTimeout(() => {
          openTimer.current = null;
          setPanel(anchor);
        }, HOVER_OPEN_MS);
      };
      const scheduleClose = () => {
        cancelOpen();
        cancelClose();
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          setPanel(null);
        }, HOVER_CLOSE_MS);
      };
      const keepOpen = () => {
        cancelOpen();
        cancelClose();
      };
      return import_react.default.createElement("span", {
        style: { position: "relative", display: "inline-flex" },
        onMouseEnter: openPanel,
        onMouseLeave: scheduleClose
      },
        import_react.default.createElement("span", {
          className,
          style: pillStyle(resolved)
        }, children),
        panel !== null
          ? import_react.default.createElement("div", {
              style: { display: "contents" },
              onMouseEnter: keepOpen,
              onMouseLeave: scheduleClose
            }, import_react.default.createElement(PillColorPanel, {
              t,
              pillKey,
              tip,
              anchor: panel,
              resolved
            }))
          : null
      );
    }

    /**
     * The current-billing-period pill, rendered to the RIGHT of the header
     * spend/balance pill: the peak/off-peak state plus the countdown to the next
     * switch. The session cost no longer lives here — it moved into the merged
     * spend/balance pill on its left.
     *
     * Only hidden when the session's current model is positively known NOT to
     * be a DeepSeek flash/pro model; an unknown or still-loading selection
     * keeps the badge visible so it never silently disappears. The model
     * directory is re-loaded on a short retry loop until the selection lands;
     * the billing period recomputes every 30 seconds.
     */
    function PeriodBadge({ t, directory, load }) {
      const modelState = import_react.default.useSyncExternalStore(
        (fn) => directory ? directory.subscribe(fn) : noopSubscribe(),
        () => directory ? directory.getSnapshot() : noopSnapshot()
      );
      const [period, setPeriod] = import_react.default.useState(() => currentPeriod(new Date()));
      import_react.default.useEffect(() => {
        if (typeof load === "function") load();
        const id = setInterval(() => setPeriod(currentPeriod(new Date())), 30000);
        let retries = 0;
        const retryId = setInterval(() => {
          let snap = null;
          try {
            snap = typeof directory?.getSnapshot === "function" ? directory.getSnapshot() : null;
          } catch {
            snap = null;
          }
          if (snap?.current != null || retries >= 8) {
            clearInterval(retryId);
            return;
          }
          if (typeof load === "function") load();
          retries += 1;
        }, 2000);
        return () => {
          clearInterval(id);
          clearInterval(retryId);
        };
      }, []);
      const current = modelState?.current;
      const isOther = current !== null && current !== void 0 && !isDeepseekModel(current?.provider, current?.model);
      const now = new Date();
      let tip;
      let label;
      let builtIn;
      if (isOther) {
        const otherPrices = modelPrices(current?.model, period);
        tip = `${t("tip.other", { model: current?.model ?? "?" })}${otherPrices === null ? "" : ` \u00B7 ${t("tip.price", { input: formatPrice(otherPrices.input), output: formatPrice(otherPrices.output), cacheHitInput: formatPrice(otherPrices.cacheHitInput) })}`} \u00B7 ${t("tip.now", { time: formatBeijingClock(now) })}`;
        label = t("badge.other");
        builtIn = DEFAULT_PILL_COLORS.neutral;
      } else {
        const prices = modelPrices(current?.model, period);
        const countdown = formatCountdown(nextTransitionInMinutes(now));
        tip = `${t("tip." + period)} \u00B7 ${t("tip.next", { countdown })}${prices === null ? "" : ` \u00B7 ${t("tip.price", { input: formatPrice(prices.input), output: formatPrice(prices.output), cacheHitInput: formatPrice(prices.cacheHitInput) })}`} \u00B7 ${t("tip.now", { time: formatBeijingClock(now) })}`;
        label = t("badge." + period) + t("badge.next", { countdown });
        builtIn = period === "peak" ? DEFAULT_PILL_COLORS.alert : DEFAULT_PILL_COLORS.neutral;
      }
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: "peak",
        tip,
        builtIn,
        className: "dsh-peak-indicator-badge"
      }, label);
    }

    /**
     * The header pill that merges the two money figures into one capsule:
     * "本会话 ¥0.94 · 余额 ¥29.33". The session spend comes from the `peakCost`
     * projection, the balance from the shared balance store, and whichever part
     * has nothing to say is simply left out (no spend yet, unreadable balance).
     *
     * Its built-in colour follows the balance state — muted while unknown, red
     * below the low-balance threshold, the neutral green otherwise — because the
     * peak/off-peak colouring now belongs to the period pill beside it.
     */
    function HeaderSpend({ t, useProjection }) {
      const balance = import_react.default.useSyncExternalStore(
        balanceStore.subscribe,
        balanceStore.getSnapshot,
        balanceStore.getServerSnapshot
      );
      const projection = useProjection("peakCost");
      const totalCost = typeof projection === "object" && projection !== null && typeof projection.totalCost === "number" ? projection.totalCost : 0;
      const data = balance.data;
      const ready = balance.status === "ready" && data !== null;
      const threshold = typeof data?.lowBalanceThreshold === "number" ? data.lowBalanceThreshold : 5;
      const low = ready && typeof data.totalBalance === "number" && data.totalBalance <= threshold;
      const builtIn = !ready ? DEFAULT_PILL_COLORS.muted : low ? DEFAULT_PILL_COLORS.alert : DEFAULT_PILL_COLORS.neutral;
      const separator = t("header.separator");
      const parts = [];
      if (totalCost > 0) parts.push(t("header.spent", { amount: totalCost.toFixed(2) }));
      if (ready) parts.push(t("balance.chip", { amount: formatAmount(data.totalBalance) }));
      else if (balance.status === "error") parts.push(t("balance.unknown"));
      else parts.push(t("balance.pending"));
      const label = parts.join(separator);
      const lines = [];
      if (totalCost > 0) lines.push(`${t("header.spent.tip")} \u00B7 ${t("header.spent", { amount: totalCost.toFixed(2) })}`);
      lines.push(t("balance.tip"));
      if (ready) {
        lines.push(t("balance.detail", {
          total: formatAmount(data.totalBalance),
          granted: formatAmount(data.grantedBalance),
          toppedUp: formatAmount(data.toppedUpBalance)
        }));
        lines.push(data.isAvailable === false ? t("balance.unavailable") : t("balance.available"));
        if (low) lines.push(t("balance.low", { threshold: formatAmount(threshold) }));
        if (typeof data.source === "string") lines.push(t("balance.source", { source: data.source }));
        lines.push(t("balance.updated", { time: formatClock(data.fetchedAt) }));
        if (typeof balance.error === "string" && balance.error.length > 0) {
          lines.push(t("balance.stale"));
          lines.push(t("balance.error", { error: balance.error }));
        }
      } else if (balance.status === "error") {
        lines.push(t("balance.error", { error: balance.error ?? "unknown" }));
      } else {
        lines.push(t("balance.refresh"));
      }
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: "headerBalance",
        tip: lines.join(separator),
        builtIn,
        className: "dsh-cost-balance-indicator-header"
      }, label);
    }

    /**
     * Per-turn cost chip rendered at the end of each assistant turn (the
     * turn-tail actions row): the actual token cost of the WHOLE turn —
     * every step of the turn is aggregated (a turn often spans several
     * tool-call steps, each with its own usage), so that the turn chip plus
     * the previous session total equals the new session total. Styled as a
     * period-colored pill like the header badge (green off-peak / red peak).
     */
    function TurnCost({ messageId, useProjection, t }) {
      const [period, setPeriod] = import_react.default.useState(() => currentPeriod(new Date()));
      import_react.default.useEffect(() => {
        const id = setInterval(() => setPeriod(currentPeriod(new Date())), 30000);
        return () => clearInterval(id);
      }, []);
      const projection = useProjection("peakCost");
      if (typeof projection !== "object" || projection === null) return null;
      const entry = projection.messageCosts?.[messageId];
      if (typeof entry !== "object" || entry === null) return null;
      const isDS = isDeepseekModel(entry.provider, entry.model);
      // Historical turns keep the color of the period in which they happened;
      // fall back to the live period only when the projection has no record.
      const chipPeriod = typeof entry.period === "string" ? entry.period : period;
      let cost = entry.cost;
      if (typeof entry.turn === "number") {
        cost = 0;
        for (const row of Object.values(projection.messageCosts)) {
          if (row !== null && typeof row === "object" && row.turn === entry.turn) cost += typeof row.cost === "number" ? row.cost : 0;
        }
      }
      if (typeof cost !== "number" || cost <= 0) return null;
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: "turnCost",
        tip: t("turn.tip"),
        builtIn: !isDS || chipPeriod === "offpeak" ? DEFAULT_PILL_COLORS.neutral : DEFAULT_PILL_COLORS.alert,
        className: "dsh-peak-indicator-turn-cost"
      }, t("turn.cost", { amount: cost.toFixed(2) }));
    }

    /**
     * The balance pill. Registered twice with the same component: in the
     * session header, immediately right of the peak/off-peak badge, and in the
     * turn-tail actions row, immediately right of the per-turn price chip — so
     * both places show an identical pill.
     * @param props - locale-bound `t` plus the pill key this registration owns.
     * @returns the pill element.
     */
    function BalanceChip({ t, pillKey }) {
      const snapshot = import_react.default.useSyncExternalStore(
        balanceStore.subscribe,
        balanceStore.getSnapshot,
        balanceStore.getServerSnapshot
      );
      const data = snapshot.data;
      const ready = snapshot.status === "ready" && data !== null;
      const threshold = typeof data?.lowBalanceThreshold === "number" ? data.lowBalanceThreshold : 5;
      const low = ready && typeof data.totalBalance === "number" && data.totalBalance <= threshold;
      const builtIn = !ready ? DEFAULT_PILL_COLORS.muted : low ? DEFAULT_PILL_COLORS.alert : DEFAULT_PILL_COLORS.neutral;
      let label;
      if (ready) label = t("balance.chip", { amount: formatAmount(data.totalBalance) });
      else if (snapshot.status === "error") label = t("balance.unknown");
      else label = t("balance.pending");
      const lines = [t("balance.tip")];
      if (ready) {
        lines.push(t("balance.detail", {
          total: formatAmount(data.totalBalance),
          granted: formatAmount(data.grantedBalance),
          toppedUp: formatAmount(data.toppedUpBalance)
        }));
        lines.push(data.isAvailable === false ? t("balance.unavailable") : t("balance.available"));
        if (low) lines.push(t("balance.low", { threshold: formatAmount(threshold) }));
        if (typeof data.source === "string") lines.push(t("balance.source", { source: data.source }));
        lines.push(t("balance.updated", { time: formatClock(data.fetchedAt) }));
        if (typeof snapshot.error === "string" && snapshot.error.length > 0) {
          lines.push(t("balance.stale"));
          lines.push(t("balance.error", { error: snapshot.error }));
        }
      } else if (snapshot.status === "error") {
        lines.push(t("balance.error", { error: snapshot.error ?? "unknown" }));
      } else {
        lines.push(t("balance.refresh"));
      }
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: pillKey ?? "turnBalance",
        tip: lines.join(" \u00B7 "),
        builtIn,
        className: "dsh-cost-balance-indicator-balance"
      }, label);
    }

    function CompactSettingsRow({ t, scope }) {
      const snapshot = import_react.default.useSyncExternalStore(
        (listener) => scope.subscribe(listener),
        () => scope.getSnapshot(),
        () => scope.getSnapshot()
      );
      const ac = snapshot.value?.autoCompact ?? {};
      // `set(field, value)` is the client's own scope API; the older
      // `write({ op, path, value })` call is kept only as a fallback, because a
      // scope without `set` silently ignored every edit this card made.
      const update = (patch) => {
        const next = { ...ac, ...patch };
        const writer = settingsWriter(scope, "autoCompact");
        if (writer === null) return Promise.resolve();
        return Promise.resolve(writer(next)).catch(() => {});
      };
      const budget = ac.contextBudget ?? 100000;
      const retain = ac.retainTokens ?? 15000;
      return import_react.default.createElement("div", { style: { borderBottom: "1px solid var(--dsw-alias-border-l2)", padding: "16px 0" } },
        import_react.default.createElement("div", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 14, marginBottom: 10 } }, t("settings.compact.title")),
        import_react.default.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 13 } },
          import_react.default.createElement("input", { type: "checkbox", checked: Boolean(ac.enabled), onChange: (e) => update({ enabled: e.target.checked }) }),
          t("settings.compact.enabled")),
        import_react.default.createElement("div", { style: { display: "flex", gap: 10, marginTop: 10, alignItems: "center", fontSize: 13 } },
          import_react.default.createElement("label", null, t("settings.compact.budget")),
          import_react.default.createElement("select", { value: budget, onChange: (e) => update({ contextBudget: Number(e.target.value) }) },
            [60000, 100000, 150000, 200000].map((n) => import_react.default.createElement("option", { key: n, value: n }, `${Math.round(n / 1000)}k`))),
          import_react.default.createElement("label", null, t("settings.compact.retain")),
          import_react.default.createElement("select", { value: retain, onChange: (e) => update({ retainTokens: Number(e.target.value) }) },
            [8000, 15000, 30000].map((n) => import_react.default.createElement("option", { key: n, value: n }, `${Math.round(n / 1000)}k`)))),
        import_react.default.createElement("div", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12, marginTop: 8 } }, t("settings.compact.hint")));
    }

    // ========================================================================
    // Row wiring
    // ========================================================================

    var inject = ["slots", "locale", "modelDirectories", "settingsScope"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS_PEAK, { zh, en }), "cost-balance-indicator: pricing dictionaries");
      ctx.effect(() => ctx.locale.register(NS_BALANCE, { zh: zhBalanceFull, en: enBalanceFull }), "cost-balance-indicator: balance dictionaries");
      // The colour section lives in the plugin's own settings namespace, so a
      // chosen palette survives a restart and reaches every open tab.
      let colorSettingsScope = null;
      try {
        colorSettingsScope = ctx.settingsScope.bind({ namespace: "cost-balance-indicator" });
      } catch (error) {
        colorSettingsScope = null;
      }
      if (colorSettingsScope !== null) colorStore.bindScope(colorSettingsScope);
      // Session header, left to right: the merged spend+balance pill (20), then
      // the billing-period pill (21) that used to carry the cost itself.
      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
        name: "conversation.session.header.actions",
        id: "cost-balance-indicator-header",
        order: 20,
        locale: NS_BALANCE,
        inject: () => ({ pillKey: "headerBalance" })
      }, HeaderSpend));
      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
        name: "conversation.session.header.actions",
        id: "cost-balance-indicator-peak",
        order: 21,
        locale: NS_PEAK,
        inject: (sessionId) => {
          try {
            const directory = ctx.modelDirectories.directoryFor(sessionId);
            return {
              directory: directory.store,
              load: () => directory.load().catch(() => {})
            };
          } catch {
            return { directory: null };
          }
        }
      }, PeriodBadge));
      // Turn tail: per-turn price chip (100) then the same balance pill (101).
      ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
        name: "conversation.chat.assistant-actions",
        id: "cost-balance-indicator-turn",
        order: 100,
        locale: NS_PEAK
      }, TurnCost));
      ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
        name: "conversation.chat.assistant-actions",
        id: "cost-balance-indicator-balance",
        order: 101,
        locale: NS_BALANCE,
        inject: () => ({ pillKey: "turnBalance" })
      }, BalanceChip));
      // Settings: the auto-compaction card, under this plugin's own entry and
      // in the general settings list.
      const scopeInject = () => ({ scope: colorSettingsScope ?? ctx.settingsScope.bind({ namespace: "cost-balance-indicator" }) });
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        id: "cost-balance-indicator-compaction",
        key: "cost-balance-indicator",
        order: 40,
        locale: NS_PEAK,
        inject: scopeInject
      }, CompactSettingsRow));
      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "cost-balance-indicator-compaction-general",
        order: 40,
        locale: NS_PEAK,
        inject: scopeInject
      }, CompactSettingsRow));
      ctx.effect(() => () => balanceStore.stopPolling(), "cost-balance-indicator: poll timer");
    }
    var client_default = { apply, inject };
    //#endregion

    return module.exports;
  }
});
