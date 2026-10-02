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
// Every pill keeps the price chip's vertical size and geometry by default
// (fontSize 12, lineHeight 18px, padding 1px 8px, borderRadius 999, 1px border,
// CNY with two decimals), with the DSH light surface as the built-in palette and
// red reserved for the peak period / a low balance. Hovering any pill opens an
// interactive colour overlay: an RGB wheel plus R/G/B and value sliders that
// recolour the text, border and background of all four pills at once (the
// right-hand position of the mode switch, the default) or of the hovered pill
// alone (the left-hand position). The overlay is built from the theme's own
// `--dsw-alias-*` tokens, so it follows whatever skin is active instead of
// hard-coded colours.
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
      CN_HOLIDAYS_2026: () => CN_HOLIDAYS_2026,
      ColorablePill: () => ColorablePill,
      HeaderSpend: () => HeaderSpend,
      DEFAULT_PILL_COLORS: () => DEFAULT_PILL_COLORS,
      HOVER_CLOSE_MS: () => HOVER_CLOSE_MS,
      HOVER_OPEN_MS: () => HOVER_OPEN_MS,
      OVERLAY_CLOSE_ANIM: () => OVERLAY_CLOSE_ANIM,
      OVERLAY_CLOSE_FADE: () => OVERLAY_CLOSE_FADE,
      OVERLAY_OPEN_ANIM: () => OVERLAY_OPEN_ANIM,
      OVERLAY_OPEN_FADE: () => OVERLAY_OPEN_FADE,
      OVERLAY_STYLE_ID: () => OVERLAY_STYLE_ID,
      OVERLAY_STYLE_TEXT: () => OVERLAY_STYLE_TEXT,
      OVERLAY_Z: () => OVERLAY_Z,
      OFFICIAL_PRICE_MODELS: () => OFFICIAL_PRICE_MODELS,
      PILL_KEYS: () => PILL_KEYS,
      PILL_PRESETS: () => PILL_PRESETS,
      PeakBadge: () => PeakBadge,
      PeriodBadge: () => PeriodBadge,
      PillColorPanel: () => PillColorPanel,
      activePresetId: () => activePresetId,
      TurnCost: () => TurnCost,
      apply: () => apply,
      armColorPicker: () => armColorPicker,
      balanceStore: () => balanceStore,
      beijingMinutes: () => beijingMinutes,
      cleanColor: () => cleanColor,
      colorStore: () => colorStore,
      computedColorToHex: () => computedColorToHex,
      currentPeriod: () => currentPeriod,
      default: () => client_default,
      diagState: () => diagState,
      disarmColorPicker: () => disarmColorPicker,
      en: () => en,
      formatAmount: () => formatAmount,
      formatPrice: () => formatPrice,
      hexToRgb: () => hexToRgb,
      hsvToRgb: () => hsvToRgb,
      inject: () => inject,
      injectOverlayStyles: () => injectOverlayStyles,
      isCnHoliday: () => isCnHoliday,
      isDeepseekModel: () => isDeepseekModel,
      modelPrices: () => modelPrices,
      normalizeColorSettings: () => normalizeColorSettings,
      officialPriceNoteFor: () => officialPriceNoteFor,
      overlayAnimationCss: () => overlayAnimationCss,
      overlayPopStyle: () => overlayPopStyle,
      overlayTransformOrigin: () => overlayTransformOrigin,
      pickerArmed: () => pickerArmed,
      pickerColorHex: () => pickerColorHex,
      pickerHintLabel: () => pickerHintLabel,
      pillStyle: () => pillStyle,
      reportDiagnostics: () => reportDiagnostics,
      resolveElementColor: () => resolveElementColor,
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
      // The label and this line share one order — cache-hit input, cache-miss
      // input, output — and one unit, 元 per 1M tokens, stated exactly once.
      "tip.price": "\u7F13\u5B58\u547D\u4E2D {cacheHitInput} \u00B7 \u672A\u547D\u4E2D\u8F93\u5165 {input} \u00B7 \u8F93\u51FA {output}\uFF08\u5143/\u6BCF\u767E\u4E07 tokens\uFF09",
      // The overlay's authoritative price row, at the very bottom of the panel.
      // The period name, the unit and the three official prices appear exactly
      // once, in the official order (cache hit / cache miss / output).
      "colors.price.period": "\u5F53\u524D\u65F6\u6BB5\uFF08{period}\uFF09\u6BCF\u767E\u4E07 tokens\uFF1A\u7F13\u5B58\u547D\u4E2D \u00A5{cacheHitInput} \u00B7 \u672A\u547D\u4E2D \u00A5{input} \u00B7 \u8F93\u51FA \u00A5{output}",
      "colors.price.none": "\u8BE5\u6A21\u578B\u65E0\u5B98\u65B9\u5CF0\u8C37\u4EF7",
      // The same statement for a model that is not a DeepSeek flash/pro: it is
      // named, because "no peak/off-peak price" is the accurate wording for it.
      "colors.price.flat": "\u5F53\u524D\u6A21\u578B {model}\uFF08\u975E DeepSeek\uFF09\u65E0\u5B98\u65B9\u5CF0\u8C37\u4EF7",
      // The row when the session's own model cannot be resolved (the desktop
      // client's model directory often never answers): the CURRENT period's
      // official prices of the DeepSeek models, labelled as the official list and
      // naming each model, so it can never be read as this session's own price.
      // The row must never be empty — an empty overlay was the reported bug.
      "colors.price.official": "\u5F53\u524D\u65F6\u6BB5\uFF08{period}\uFF09\u6BCF\u767E\u4E07 tokens\uFF08\u5B98\u65B9\u724C\u4EF7\uFF09\uFF1A{models}",
      "colors.price.official.item": "{model} \u547D\u4E2D \u00A5{cacheHitInput} \u00B7 \u672A\u547D\u4E2D \u00A5{input} \u00B7 \u8F93\u51FA \u00A5{output}",
      "colors.price.official.separator": "\uFF1B",
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
      "tip.price": "Cache hit {cacheHitInput} \u00B7 Cache-miss input {input} \u00B7 Output {output} (CNY per 1M tokens)",
      "colors.price.period": "Current period ({period}) per 1M tokens: cached \u00A5{cacheHitInput} \u00B7 uncached \u00A5{input} \u00B7 output \u00A5{output}",
      "colors.price.none": "No official peak/off-peak price for this model",
      "colors.price.flat": "Model {model} (non-DeepSeek) has no official peak/off-peak price",
      "colors.price.official": "Current period ({period}) per 1M tokens (official list prices): {models}",
      "colors.price.official.item": "{model} cached \u00A5{cacheHitInput} \u00B7 uncached \u00A5{input} \u00B7 output \u00A5{output}",
      "colors.price.official.separator": "; ",
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
      "colors.reset.one": "\u6062\u590D\u6D45\u8272\u9ED8\u8BA4",
      "colors.reset.all": "\u5168\u90E8\u6062\u590D\u6D45\u8272\u9ED8\u8BA4",
      "colors.eyedropper": "\u53D6\u8272",
      "colors.eyedropper.tip": "\u53D6\u8272\uFF1A\u70B9\u4E00\u4E0B\u540E\u9F20\u6807\u6240\u5230\u4E4B\u5904\u7684\u989C\u8272\u4F1A\u663E\u793A\u5728\u5C0F\u6D6E\u7A97\u91CC\uFF1B\u5DE6\u952E\u786E\u8BA4\uFF0C\u53F3\u952E\u6216 Esc \u53D6\u6D88",
      "colors.picker.hint": "\u5DE6\u952E\u786E\u8BA4 \u00B7 \u53F3\u952E\u53D6\u6D88",
      "colors.save": "\u4FDD\u5B58",
      "colors.save.tip": "\u914D\u8272\u4F1A\u81EA\u52A8\u4FDD\u5B58\uFF1B\u70B9\u6B64\u7ACB\u5373\u5199\u5165 ~/.dsh/settings.yaml",
      "colors.save.saved": "\u5DF2\u4FDD\u5B58",
      "colors.save.saving": "\u4FDD\u5B58\u4E2D\u2026",
      "colors.save.local": "\u5DF2\u5B58\u672C\u673A\uFF08\u4E3B\u673A\u672A\u63A5\u53D7\uFF0C\u91CD\u542F DSH \u540E\u5C31\u4F1A\u5199\u5165\u914D\u7F6E\uFF09",
      "colors.save.error": "\u4FDD\u5B58\u5931\u8D25\uFF1A{error}",
      "colors.hint": "\u81EA\u5B9A\u4E49\u540E\u8BE5\u80F6\u56CA\u6240\u6709\u72B6\u6001\uFF08\u5CF0\u8C37\u3001\u4F4E\u4F59\u989D\u3001\u9519\u8BEF\uFF09\u90FD\u7528\u8FD9\u5957\u989C\u8272",
      "colors.preview": "\u9884\u89C8",
      "colors.topup": "\u5145\u503C",
      "colors.topup.tip": "\u6253\u5F00\u5145\u503C\u9875\uFF1B\u672A\u914D\u7F6E API Key \u65F6\u6253\u5F00\u767B\u5F55\u9875\uFF08\u9ED8\u8BA4 platform.deepseek.com/top_up\uFF09",
      /** Shared overlay labels (the price row itself is `colors.price.*`). */
      "colors.preset": "\u9884\u8BBE",
      "colors.preset.dark": "\u6DF1\u8272",
      "colors.preset.dark.tip": "\u4E0E DSH \u684C\u9762\u7AEF\u6DF1\u8272\u4E3B\u9898\u4E00\u81F4\u7684\u914D\u8272\uFF08\u6587\u5B57 #F9FAFB\uFF0C\u80CC\u666F #2C2C2E\uFF09",
      "colors.preset.light": "\u6D45\u767D",
      "colors.preset.light.tip": "\u4E0E DSH \u684C\u9762\u7AEF\u6D45\u8272\u4E3B\u9898\u4E00\u81F4\u7684\u914D\u8272\uFF08\u6587\u5B57 #0F1115\uFF0C\u80CC\u666F #F5F6F7\uFF09\uFF1B\u672A\u81EA\u5B9A\u4E49\u65F6\u5C31\u662F\u9ED8\u8BA4\u914D\u8272",
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
      "colors.reset.one": "Restore light default",
      "colors.reset.all": "Reset all to light",
      "colors.eyedropper": "Pick",
      "colors.eyedropper.tip": "Pick a colour: the colour under the pointer shows in a small chip; click to confirm, right-click or Esc to cancel",
      "colors.picker.hint": "Click to confirm \u00B7 right-click to cancel",
      "colors.save": "Save",
      "colors.save.tip": "Colours save automatically; click to write ~/.dsh/settings.yaml right now",
      "colors.save.saved": "Saved",
      "colors.save.saving": "Saving\u2026",
      "colors.save.local": "Kept on this browser only (host refused; a DSH restart makes it stick)",
      "colors.save.error": "Save failed: {error}",
      "colors.hint": "A custom colour overrides every state (peak, low balance, error)",
      "colors.preview": "Preview",
      "colors.topup": "Top up",
      "colors.topup.tip": "Open the top-up page; with no API key configured it opens the sign-in page (platform.deepseek.com/top_up by default)",
      "colors.preset": "Preset",
      "colors.preset.dark": "Dark",
      "colors.preset.dark.tip": "Matches the DSH desktop app's dark theme (text #F9FAFB, surface #2C2C2E)",
      "colors.preset.light": "Light",
      "colors.preset.light.tip": "Matches the DSH desktop app's light theme (text #0F1115, surface #F5F6F7); this is the untuned default",
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
      "deepseek-flash": { input: 2, output: 8, cacheHitInput: 0.04 },
  "deepseek-v4-flash": { input: 2, output: 8, cacheHitInput: 0.04 },
  "deepseek-v4-flash-vision-exp": { input: 2, output: 8, cacheHitInput: 0.04 },
      "deepseek-v4-pro": { input: 9, output: 27, cacheHitInput: 0.3 },
  "deepseek-v4-pro-0813": { input: 9, output: 27, cacheHitInput: 0.3 }
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

    /**
     * The overlay's bottom price row for one model in one billing period, or an
     * empty string when the caller cannot state a period at all (a still-loading
     * selection, no recorded period).
     *
     * The three official prices appear exactly once, in the official page's order
     * — cache-hit input, cache-miss input, output — per 1M tokens. A model with no
     * official price entry says so instead of printing a made-up number.
     */
    function priceNoteFor(t, model, period) {
      if (typeof period !== "string" || period.length === 0) return "";
      if (typeof model !== "string" || model.length === 0) return "";
      const prices = modelPrices(model, period);
      if (prices === null) return t("colors.price.none");
      return t("colors.price.period", {
        period: t("badge." + period),
        cacheHitInput: formatPrice(prices.cacheHitInput),
        input: formatPrice(prices.input),
        output: formatPrice(prices.output)
      });
    }

    /**
     * The same bottom row for a model that is NOT billed under the DeepSeek
     * peak/off-peak scheme: it states the model's name and says there is no
     * official peak/off-peak price, which is the one accurate wording for it.
     */
    function flatPriceNoteFor(t, model) {
      return t("colors.price.flat", { model: model ?? "?" });
    }

    /**
     * The canonical ids the fallback row names. They are the table's own model
     * names (a flash family and a pro family), never aliases: the row exists so a
     * session whose model cannot be resolved still shows REAL numbers.
     */
    var OFFICIAL_PRICE_MODELS = ["deepseek-flash", "deepseek-v4-pro"];

    /**
     * The period pill's fallback price row: the CURRENT period's official prices
     * of the DeepSeek models, printed when the session's own model cannot be
     * resolved. That is the normal case in the desktop app — its
     * `modelDirectories.directoryFor(sessionId)` often never answers — and the
     * row used to stay empty then, so the panel's last block was missing.
     *
     * Everything here is the pill's own period, so the peak/off-peak factor is
     * the one the badge states; the label says "official list prices" and names
     * each model, so the row can never be read as this session's own rate. No
     * number is invented: the prices come from `MODEL_PRICES` through
     * `modelPrices`, and a table that lost a model simply drops that item.
     */
    function officialPriceNoteFor(t, period) {
      if (typeof period !== "string" || period.length === 0) return "";
      const items = OFFICIAL_PRICE_MODELS.map((model) => {
        const prices = modelPrices(model, period);
        if (prices === null) return "";
        return t("colors.price.official.item", {
          model,
          cacheHitInput: formatPrice(prices.cacheHitInput),
          input: formatPrice(prices.input),
          output: formatPrice(prices.output)
        });
      }).filter((item) => item.length > 0);
      if (items.length === 0) return "";
      return t("colors.price.official", {
        period: t("badge." + period),
        models: items.join(t("colors.price.official.separator"))
      });
    }

    /** Minutes since Beijing midnight for `now`. */
    function beijingMinutes(now) {
      return (now.getUTCHours() * 60 + now.getUTCMinutes() + BEIJING_OFFSET_MINUTES) % 1440;
    }

    function beijingDay(now) {
      return new Date(now.getTime() + BEIJING_OFFSET_MINUTES * 60 * 1000).getUTCDay();
    }

    /** Beijing calendar date as "YYYY-MM-DD". */
    function beijingDate(now) {
      return new Date(now.getTime() + BEIJING_OFFSET_MINUTES * 60 * 1000).toISOString().slice(0, 10);
    }

    /**
     * Chinese statutory holidays, which the official rule bills as OFF-PEAK all
     * day ("中国法定节假日全天按空闲时段计费", pricing-page footnote). DeepSeek
     * publishes no per-date list of its own, so this is the official State Council
     * 2026 安排 (国办发明电〔2025〕7号, published 2025-11-04). Weekends AND statutory
     * holidays are off-peak; a 调休 working weekend stays off-peak as well, because
     * the weekend test is by weekday and never consults a makeup-workday list — so
     * only the statutory holiday dates need listing here.
     * Extend this table when the next year's 安排 is published.
     */
    var CN_HOLIDAYS_2026 = [
      "2026-01-01", "2026-01-02", "2026-01-03",
      "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
      "2026-04-04", "2026-04-05", "2026-04-06",
      "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
      "2026-06-19", "2026-06-20", "2026-06-21",
      "2026-09-25", "2026-09-26", "2026-09-27",
      "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
    ];
    /** "YYYY-MM-DD" (Beijing) -> true when a statutory holiday. */
    function isCnHoliday(now) {
      return CN_HOLIDAYS_2026.includes(beijingDate(now));
    }

    /** Current billing period: "peak" | "offpeak". */
    function currentPeriod(now) {
      const value = now ?? new Date();
      const day = beijingDay(value);
      // Weekends are off-peak from 2026-08-23 on, and statutory holidays always are.
      if (value.getTime() >= WEEKEND_OFFPEAK_EFFECTIVE_AT && (day === 0 || day === 6)) return "offpeak";
      if (isCnHoliday(value)) return "offpeak";
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
      // A statutory holiday flips nothing all day: the countdown runs to the next
      // 09:00 that is neither a weekend nor a holiday.
      if (isCnHoliday(value)) {
        for (let ahead = 1; ahead <= 8; ahead += 1) {
          const candidate = new Date(value.getTime() + ahead * 1440 * 60 * 1000);
          const candidateDay = beijingDay(candidate);
          if (candidateDay === 0 || candidateDay === 6) continue;
          if (isCnHoliday(candidate)) continue;
          return ahead * 1440 - bj + 9 * 60;
        }
        return 1440 - bj + 9 * 60;
      }
      const boundaries = [];
      for (const [startHour, endHour] of PEAK_WINDOWS) boundaries.push(startHour * 60, endHour * 60);
      boundaries.sort((a, b) => a - b);
      for (const boundary of boundaries) if (boundary > bj) return boundary - bj;
      // After the last window of the day: if tomorrow is off-peak all day, the
      // countdown lands on the following working-day 09:00 instead.
      const tomorrow = new Date(value.getTime() + 1440 * 60 * 1000);
      const tomorrowDay = beijingDay(tomorrow);
      const tomorrowOffAllDay = isCnHoliday(tomorrow) || (value.getTime() >= WEEKEND_OFFPEAK_EFFECTIVE_AT && (tomorrowDay === 0 || tomorrowDay === 6));
      if (tomorrowOffAllDay) {
        for (let ahead = 2; ahead <= 8; ahead += 1) {
          const candidate = new Date(value.getTime() + ahead * 1440 * 60 * 1000);
          const candidateDay = beijingDay(candidate);
          if (candidateDay === 0 || candidateDay === 6) continue;
          if (isCnHoliday(candidate)) continue;
          return ahead * 1440 - bj + 9 * 60;
        }
      }
      return 1440 - bj + boundaries[0];
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

    /**
     * The top-up and sign-in pages a host balance payload carries. The host
     * stamps both onto EVERY payload — including the ones that read no balance
     * (no API key configured, HTTP failure) — so a failed read must keep them:
     * without that the overlay's 充值 entry would dead-end on the official
     * top-up page for exactly the user who has to sign in first.
     * @returns `{ topUpUrl, loginUrl }` (either may be null), or the links the
     * previous payload left behind when this one carries none at all.
     */
    function rememberLinks(body) {
      const source = typeof body === "object" && body !== null ? body : {};
      const link = (value) => typeof value === "string" && value.length > 0 ? value : null;
      const next = { topUpUrl: link(source.topUpUrl), loginUrl: link(source.loginUrl) };
      if (next.topUpUrl === null && next.loginUrl === null) return state.links ?? null;
      return next;
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
          publish({ status: "ready", data: body, error: typeof body.error === "string" ? body.error : null, links: rememberLinks(body) });
          return;
        }
        publish({ status: "error", data: null, error: typeof body.error === "string" ? body.error : `HTTP ${status}`, links: rememberLinks(body) });
      }).catch((error) => {
        lastReadAt = Date.now();
        publish({ status: "error", data: null, error: error?.message ?? String(error), links: state.links ?? null });
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
    /**
     * The DSH desktop app's own two surfaces, read from the app's served
     * stylesheet: `--dsw-alias-label-primary` for the text and
     * `--dsw-alias-bg-module-platform` for the background in light mode, with
     * `--dsw-alias-label-primary`, `--dsw-alias-bg-layer-2` and
     * `--dsw-static-neutral-bluish-800` for text/background/border in dark mode.
     * The light one is also the built-in neutral palette, so the two are declared
     * together and can never drift apart.
     */
    var LIGHT_PILL_COLORS = Object.freeze({ text: "#0F1115", border: "#E1E5EE", background: "#F5F6F7" });
    var DARK_PILL_COLORS = Object.freeze({ text: "#F9FAFB", border: "#353638", background: "#2C2C2E" });
    /**
     * Default (built-in) palettes. The untouched look is the LIGHT panel colours;
     * the two state signals are kept on top of it: red for the peak period and for
     * a balance below the threshold, muted grey while the balance cannot be read.
     */
    var DEFAULT_PILL_COLORS = Object.freeze({
      // off-peak / neutral: the DSH light surface (the light preset)
      neutral: LIGHT_PILL_COLORS,
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
     * The colour presets offered in the overlay — exactly the DSH desktop app's
     * two themes. There is no "default" preset: the built-in palette IS the light
     * one, so `light` is the preset that is active while nothing is customised,
     * and it is also what both reset buttons land on.
     *
     * `dark` and `light` stay plain hexes, so the wheel can keep editing them
     * afterwards.
     */
    var PILL_PRESETS = [
      { id: "dark", colors: { ...DARK_PILL_COLORS } },
      { id: "light", colors: { ...LIGHT_PILL_COLORS } }
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
    /**
     * The preset whose colours the given scope currently shows, if any.
     *
     * An EMPTY scope is not "no preset": the built-in palette is the light one, so
     * an untouched scope matches `light` — which is what the overlay has to
     * highlight before the user changes anything. Hexes that match no preset (a
     * wheel edit) return null, so the highlight disappears exactly as before.
     */
    function activePresetId(colors, scopeKey) {
      const entry = colors?.[scopeKey] ?? emptyPillColor();
      for (const preset of PILL_PRESETS) {
        if (entry.text === preset.colors.text && entry.border === preset.colors.border && entry.background === preset.colors.background) return preset.id;
      }
      const pristine = entry.text === "" && entry.border === "" && entry.background === "";
      return pristine && PILL_PRESETS.some((preset) => preset.id === "light") ? "light" : null;
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
     * the write — the case that made colours snap back to the built-in palette —
     * and it is dropped again as soon as a host write succeeds, so the settings
     * document stays the single source of truth once the host accepts it.
     */
    var colorState = { mode: "all", colors: defaultColorSettings(), save: { status: "idle", message: "" } };
    var colorListeners = /* @__PURE__ */ new Set();
    var colorScope = null;
    var colorPersistTimer = null;
    var colorSaveClearTimer = null;
    /** Bumped on every local edit, so a late write cannot claim saved. */
    var colorEditGeneration = 0;
    /** Browser-storage key of the reload-proof copy. */
    var COLOR_STORAGE_KEY = "dsh-cost-balance-indicator.pillColors";
    /**
     * WHICH persistence backend the colour store actually bound, and how it got
     * there. Without this the store can only be seen from the outside through
     * `save.status`, and `local` (the browser-storage fallback) never says whether
     * the client offered no backend at all or every path to one failed.
     */
    var colorBackendKind = "none";
    var colorRemoteResolvedVia = "none";
    var colorBackendBoundAt = 0;
    /**
     * How the resolved `remote.settings` service was obtained. `diagState()` also
     * carries the counters below, and `reportDiagnostics()` posts the whole thing.
     */
    var remoteResolveAttempts = 0;
    var remoteResolveNulls = 0;
    var remoteResolveNotes = [];
    /**
     * WHICH `remote.settings` write method the host actually accepted, and every
     * refusal on the way there. A newer bundled core validates a settings write
     * against the fields a plugin declared volatile and refuses the whole write
     * with `settings/rejected: Plugin entry "…" has no volatile fields` — a
     * refusal `save.status` can only report as a bare error string. This records
     * the raw `code: message` of each attempt plus the method that worked, so the
     * desktop app's actual write path is provable from outside.
     */
    var remoteWriteMethod = "none";
    var remoteWriteAttempts = [];
    /** Marker carried in the self-report so a served bundle names its own build. */
    var REMOTE_WRITE_BUILD = "cbi-write-chain-0.8.1+mutate-update-replace";
    /**
     * The host's OWN view of this plugin's namespace, taken from `describe()`:
     * `applies`, `revision` and the raw key names of the entry and of its value.
     * Keys only — never the whole document, which can be large and holds other
     * plugins' configuration.
     */
    var remoteNamespaceView = null;

    /** Record one raw write attempt outcome for the self-report (bounded). */
    function noteWriteAttempt(record) {
      remoteWriteAttempts.push(record);
      if (remoteWriteAttempts.length > 8) remoteWriteAttempts.splice(0, remoteWriteAttempts.length - 8);
    }

    /** The plain key names of an object (or null when it is not one). */
    function objectKeys(value) {
      return value !== null && typeof value === "object" && Array.isArray(value) === false ? Object.keys(value) : null;
    }
    /**
     * Set by `mountSurfaces` to register the settings cards against whichever
     * backend ends up bound. The RPC backend binds asynchronously, so the cards
     * cannot be registered next to the binding attempt itself.
     */
    var colorCardsMounter = null;

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
      // The edit generation, not object identity: the remote-backed scope
      // republishes the stored section after a write, which replaces the colours
      // object — identity would then hide the "saved" status.
      const generation = colorEditGeneration;
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
          if (colorEditGeneration === generation) {
            dropLocalColors();
            setSaveStatus("saved", "");
          }
          return true;
        },
        (error) => {
          writeLocalColors(attempted);
          if (colorEditGeneration === generation) setSaveStatus("error", String(error?.message ?? error));
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
      colorEditGeneration += 1;
      notifyColors({ ...colorState, mode: colors.mode, colors });
      // The browser copy is synchronous, so a reload never loses an edit even
      // while the host write is still in flight or was refused.
      writeLocalColors(colors);
      if (immediate === true) persistColors();
      else schedulePersist();
    }

    var colorStore = {
      /**
       * Attach a persistence backend to the store.
       * @param scope - the settings scope (binder path) or the `remote.settings`
       * backend (RPC path).
       * @param kind - `"scope-binder"` or `"remote-rpc"`, recorded for the
       * self-report so the app can be told which one it ended up with.
       */
      bindScope(scope, kind) {
        colorScope = scope;
        colorBackendKind = typeof kind === "string" && kind.length > 0 ? kind : "scope-binder";
        colorBackendBoundAt = Date.now();
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
       * Apply one preset to a scope: both presets write their three colours into
       * it. Applying `light` is visually the untouched state; to get back to the
       * built-in state palette (still light, but with the state signals) use the
       * reset buttons, which clear the scope instead.
       */
      applyPreset(scopeKey, presetId) {
        const preset = PILL_PRESETS.find((entry) => entry.id === presetId);
        const colors = { ...colorState.colors };
        colors[scopeKey] = preset === void 0 ? emptyPillColor() : { ...preset.colors };
        commitColors(colors, true);
        return colors;
      },
      /** The preset id the given scope currently matches, or null. */
      activePreset(scopeKey) {
        return activePresetId(colorState.colors, scopeKey);
      },
      /** Test/teardown helper: flush a debounced write immediately. */
      flush: persistColors,
      /**
       * WHICH backend this store bound and how the RPC one was obtained. The
       * overlay's own status line only ever shows `save.status`; this is what
       * tells a caller (and the self-report) whether `local` means "this client
       * offers no backend at all" or "a backend exists but every path failed".
       */
      saveStatus() {
        const bound = colorScope !== null;
        return {
          bound,
          kind: bound ? colorBackendKind : "none",
          resolvedVia: colorRemoteResolvedVia,
          writable: bound ? colorScope?.getSnapshot?.()?.writable !== false : false,
          status: colorState.save.status,
          message: colorState.save.message,
          boundAt: colorBackendBoundAt,
          remoteAttempts: remoteResolveAttempts,
          remoteNulls: remoteResolveNulls,
          notes: remoteResolveNotes.slice(-4),
          /** Which write method the host accepted last ("none" until one does). */
          writeMethod: remoteWriteMethod,
          /** Every `remote.settings` write attempt, with its RAW outcome. */
          writeAttempts: remoteWriteAttempts.slice(),
          /** The host's own `describe()` view of this namespace, keys only. */
          namespace: remoteNamespaceView
        };
      },
      /**
       * Bind the RPC backend from an already-resolved `remote.settings` service.
       * Exposed so the mount can retry the resolution itself and so the tests can
       * drive the exact path that failed in the desktop app.
       * @returns true when the service looked like a usable settings RPC.
       */
      bindRemoteBackend(service, via) {
        const backend = createRemoteSettingsBackend(service, "cost-balance-indicator");
        if (backend === null) return false;
        colorRemoteResolvedVia = typeof via === "string" && via.length > 0 ? via : "service";
        bindColorBackend("remote-rpc", backend);
        return true;
      }
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

    /** The `z-index` of this overlay's own chrome (see the panel below). */
    var OVERLAY_Z = 10000;
    /**
     * The two overlay animations, as `animation` shorthand values. The names are
     * the keyframes `injectOverlayStyles()` declares; the constants keep the
     * inline style and the injected stylesheet from drifting apart.
     */
    var OVERLAY_OPEN_ANIM = "dsh-cbi-overlay-pop 140ms cubic-bezier(0.2, 0.9, 0.3, 1.35) both";
    var OVERLAY_CLOSE_ANIM = "dsh-cbi-overlay-pop-out 100ms ease both";
    /** The same two animations with no scale, for `prefers-reduced-motion`. */
    var OVERLAY_OPEN_FADE = "dsh-cbi-overlay-fade 140ms ease both";
    var OVERLAY_CLOSE_FADE = "dsh-cbi-overlay-fade-out 100ms ease both";

    /**
     * Every style rule this overlay needs, injected ONCE as a single tag. The
     * panel's pop/close animations, the save button's four states and the
     * reduced-motion fallbacks all live here rather than in inline styles,
     * because keyframes and media queries cannot be expressed inline.
     */
    var OVERLAY_STYLE_ID = "dsh-cost-balance-indicator-overlay-style";
    var OVERLAY_STYLE_TEXT = `
/* Open: fade + a small scale-up that overshoots past 1 before settling. */
@keyframes dsh-cbi-overlay-pop {
  from { opacity: 0; transform: scale(0.96); }
  62% { opacity: 1; transform: scale(1.012); }
  to { opacity: 1; transform: scale(1); }
}
/* Close: the same motion runs backwards, shorter and without the overshoot. */
@keyframes dsh-cbi-overlay-pop-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.97); }
}
/* The reduced-motion fallback keeps the fades and drops every scale. */
@keyframes dsh-cbi-overlay-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dsh-cbi-overlay-fade-out { from { opacity: 1; } to { opacity: 0; } }
/* Save button states. Hover/active use the animation-duration: 1ms "revert
   layer" trick, so the end state is written in the keyframes alone and the rule
   cannot fight the :hover and :active blocks below. */
@keyframes dsh-cbi-save-lift {
  to { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.24); }
}
@keyframes dsh-cbi-save-press { to { transform: scale(0.96); } }
@keyframes dsh-cbi-save-pulse {
  50% { opacity: 0.55; box-shadow: 0 0 0 3px var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.28)); }
}
@keyframes dsh-cbi-save-pop { 45% { transform: scale(1.1); } }
@keyframes dsh-cbi-save-shake {
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}
[data-cost-balance-save="now"] {
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 180ms ease, border-color 180ms ease;
}
[data-cost-balance-save="now"]:hover { animation: dsh-cbi-save-lift 1ms linear forwards; }
[data-cost-balance-save="now"]:active { animation: dsh-cbi-save-press 1ms linear forwards; }
/* The saving pulse and the saved pop are drawn INSIDE the button, so its text
   never moves; the shake is the only one that moves the box itself. The "idle"
   state has no rule on purpose: that is what this button renders until the user
   has clicked it since the panel opened, so mounting the overlay — which replays
   a CSS animation for every new node — can never animate the button by itself. */
[data-cost-balance-save="now"][data-cost-balance-save-state="saving"] { animation: dsh-cbi-save-pulse 1100ms ease-in-out infinite; }
[data-cost-balance-save="now"][data-cost-balance-save-state="saved"] { animation: dsh-cbi-save-pop 260ms ease-out; }
[data-cost-balance-save="now"][data-cost-balance-save-state="saved"]::after { content: " \\2713"; font-weight: 600; }
[data-cost-balance-save="now"][data-cost-balance-save-state="error"] {
  animation: dsh-cbi-save-shake 240ms ease-in-out;
  color: var(--dsw-alias-label-error, #e5484d);
  border-color: var(--dsw-alias-label-error, #e5484d);
}
@media (prefers-reduced-motion: reduce) {
  [data-cost-balance-save="now"]:hover,
  [data-cost-balance-save="now"]:active { animation: none; }
  [data-cost-balance-save="now"][data-cost-balance-save-state="saving"] { animation: dsh-cbi-overlay-fade 900ms ease-in-out infinite alternate; }
  [data-cost-balance-save="now"][data-cost-balance-save-state="saved"],
  [data-cost-balance-save="now"][data-cost-balance-save-state="error"] { animation: none; }
}
`;
    /** The document this bundle injected the overlay stylesheet into (cache). */
    var overlayStyleDocument = null;

    /**
     * Inject the overlay stylesheet exactly once per document and return it.
     *
     * Idempotent twice over: the module remembers the document it already served,
     * and a `getElementById` look-up adopts a tag a previous copy of the bundle
     * left behind instead of adding a second one. Everything is guarded — a test
     * environment with no `document` (or no `createElement`) simply gets `null`
     * and the overlay renders with its inline styles alone.
     */
    function injectOverlayStyles() {
      try {
        if (overlayStyleDocument !== null) return overlayStyleDocument;
        if (typeof document !== "object" || document === null) return null;
        if (typeof document.getElementById === "function" && document.getElementById(OVERLAY_STYLE_ID) !== null) {
          overlayStyleDocument = document;
          return overlayStyleDocument;
        }
        if (typeof document.createElement !== "function") return null;
        const style = document.createElement("style");
        style.id = OVERLAY_STYLE_ID;
        style.textContent = OVERLAY_STYLE_TEXT;
        const parent = document.head ?? document.body ?? null;
        if (parent === null || typeof parent.appendChild !== "function") return null;
        parent.appendChild(style);
        overlayStyleDocument = document;
        return overlayStyleDocument;
      } catch {
        return null;
      }
    }

    /**
     * Is a colour string "the page shows nothing here"? Both the keyword and the
     * fully transparent rgba form count, with any spacing.
     */
    function isTransparentColor(value) {
      if (typeof value !== "string") return true;
      const text = value.trim().toLowerCase();
      return text === "" || text === "transparent" || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(text) || /^rgba\(\s*0\s+0\s+0\s*\/\s*0\s*\)$/.test(text);
    }

    /**
     * Text a browser computed for a colour -> one of our own `#RRGGBB` strings,
     * `""` when it cannot be parsed. This is the same `hexToRgb` / `rgbToHex` /
     * `cleanColor` family the wheel writes with, extended to the two shapes a
     * computed colour can take: `rgb()/rgba()` (Chrome ≤ 0.8.1) and `#RRGGBB`
     * (the colour spaces newer Chrome serialises to hex). Anything else — a
     * named colour, `color(display-p3 …)`, an unparsable string — becomes `""`,
     * so no value but our own hex ever reaches the store.
     */
    function computedColorToHex(value) {
      if (typeof value !== "string") return "";
      const text = value.trim();
      if (text === "") return "";
      if (isTransparentColor(text)) return "";
      const rgb = /^rgba?\(([^)]+)\)$/i.exec(text);
      if (rgb !== null) {
        const parts = rgb[1].split(/[,\/\s]+/).filter((part) => part !== "");
        if (parts.length < 3) return "";
        const channel = (part) => {
          const number = part.endsWith("%") ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part);
          return Number.isFinite(number) ? number : null;
        };
        const alpha = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;
        if (alpha === 0) return "";
        const channels = parts.slice(0, 3).map(channel);
        if (channels.some((part) => part === null)) return "";
        return rgbToHex({ r: channels[0], g: channels[1], b: channels[2] });
      }
      return cleanColor(text);
    }

    /**
     * The colour the page actually shows at one element's position: its own
     * `backgroundColor` when that is not transparent, otherwise the nearest
     * ancestor with a background, and — for an element with no background
     * anywhere above it, i.e. plain text on the page background — its computed
     * text colour. Values are normalised through `computedColorToHex`.
     */
    function resolveElementColor(element) {
      if (element === null || element === void 0) return "";
      try {
        if (typeof globalThis.getComputedStyle !== "function") return "";
        let node = element;
        let painted = "";
        for (let depth = 0; node !== null && node !== void 0 && depth < 64; depth++) {
          const style = globalThis.getComputedStyle(node);
          const background = style?.backgroundColor;
          if (!isTransparentColor(background)) {
            const hex = computedColorToHex(background);
            if (hex !== "") return hex;
          }
          if (painted === "") painted = computedColorToHex(style?.color);
          node = node.parentElement;
        }
        return painted;
      } catch {
        return "";
      }
    }

    /**
     * `transform-origin` for the pop, derived from the panel's anchor so the
     * panel grows out of its own pill rather than out of its middle. The anchor
     * is the panel's top-left corner in screen coordinates; the ratio is how far
     * along the pill sits, clamped to the panel's own box.
     */
    function overlayTransformOrigin(anchor) {
      const at = (value, size) => {
        const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
        return Math.max(0, Math.min(1, number / size));
      };
      const alongX = at(anchor?.left, OVERLAY_WIDTH);
      const alongY = at(anchor?.top, OVERLAY_HEIGHT);
      return {
        x: Math.round(alongX * OVERLAY_WIDTH),
        y: Math.round(alongY * OVERLAY_HEIGHT),
        css: `${Math.round(alongX * 100)}% ${Math.round(alongY * 100)}%`
      };
    }

    /**
     * The animation half of the panel's inline style. `prefers-reduced-motion:
     * reduce` (and any environment without `matchMedia`, such as the tests) gets
     * the plain fade; `closing` gets the reverse.
     */
    function overlayAnimationCss(phase) {
      const closing = phase === "closing";
      let reduced = false;
      try {
        if (typeof globalThis.matchMedia === "function") reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)")?.matches === true;
      } catch {
        reduced = false;
      }
      if (reduced) return closing ? OVERLAY_CLOSE_FADE : OVERLAY_OPEN_FADE;
      return closing ? OVERLAY_CLOSE_ANIM : OVERLAY_OPEN_ANIM;
    }

    /** Every style the panel needs for one phase, origin included. */
    function overlayPopStyle(anchor, phase) {
      return {
        transformOrigin: overlayTransformOrigin(anchor).css,
        animation: overlayAnimationCss(phase)
      };
    }

    // ---- the picking mode ---------------------------------------------------
    /**
     * Our own screen picking mode, replacing `window.EyeDropper`.
     *
     * The native one is a browser-level modal: while it is open the page receives
     * no mouse events at all, so a right-click could never cancel it. This mode
     * is plain DOM instead — a transparent, full-viewport capture layer with a
     * crosshair cursor (no tint: the page underneath stays exactly as it looks)
     * plus a small chip that follows the pointer and shows the colour that would
     * be picked. Left click confirms, right click and `Escape` cancel; every exit
     * removes both nodes and both listeners, so nothing is left dangling.
     */
    /** The chip's own size and its offset from the pointer, in pixels. */
    var PICKER_CHIP_WIDTH = 90;
    var PICKER_CHIP_HEIGHT = 26;
    var PICKER_CHIP_GAP = 14;
    var pickerLayer = null;
    var pickerChip = null;
    var pickerSwatch = null;
    var pickerHexText = null;
    var pickerHintText = null;
    var pickerColor = "";
    var pickerWrites = false;

    /** Is the picking mode armed right now? */
    function pickerArmed() {
      return pickerLayer !== null;
    }

    /** The colour the chip currently shows; `""` before the first move. */
    function pickerColorHex() {
      return pickerColor;
    }

    /** The chip's one-line hint in the active language. */
    function pickerHintLabel(t) {
      try {
        if (typeof t === "function") return t("colors.picker.hint");
      } catch {
        // A dictionary without the key must not break the mode.
      }
      return "\u5DE6\u952E\u786E\u8BA4 \u00B7 \u53F3\u952E\u53D6\u6D88";
    }

    /**
     * Forget every module-level handle of the mode. The listeners and the nodes
     * are the caller's business; this only clears the state a test (or a second
     * arm) can observe.
     */
    function clearPickerState() {
      pickerLayer = null;
      pickerChip = null;
      pickerSwatch = null;
      pickerHexText = null;
      pickerHintText = null;
      pickerColor = "";
      pickerWrites = false;
    }

    /**
     * Disarm the mode: remove both nodes, forget every listener and state flag.
     * Safe to call when nothing is armed, and safe to call twice.
     * @returns true when a confirm was in flight — i.e. the user picked.
     */
    function disarmColorPicker() {
      const state = pickerLayer;
      if (state === null) return false;
      const writes = pickerWrites;
      clearPickerState();
      try {
        const doc = state.doc;
        if (typeof doc.removeEventListener === "function") {
          doc.removeEventListener("mousemove", state.onMove, true);
          doc.removeEventListener("mousedown", state.onDown, true);
          doc.removeEventListener("contextmenu", state.onContext, true);
          doc.removeEventListener("keydown", state.onKey, true);
        }
        if (typeof globalThis.removeEventListener === "function") globalThis.removeEventListener("resize", state.onResize);
        state.layer.remove?.();
        state.chip.remove?.();
      } catch {
        // Removing the layer is best effort; the state is already cleared.
      }
      return writes;
    }

    /**
     * ARM the picking mode. `onPick(hex)` receives the confirmed `#RRGGBB`; it
     * is called at most once, and never for a cancel.
     * @returns true when the mode is armed (false without a usable document).
     */
    function armColorPicker(t, onPick) {
      if (pickerArmed()) return true;
      try {
        if (typeof document !== "object" || document === null || typeof document.createElement !== "function") return false;
        const chip = document.createElement("div");
        chip.setAttribute("data-cost-balance-picker-chip", "1");
        chip.style.cssText = [
          "position:fixed",
          "z-index:" + (OVERLAY_Z + 1),
          `width:${PICKER_CHIP_WIDTH}px`,
          `height:${PICKER_CHIP_HEIGHT}px`,
          "box-sizing:border-box",
          "display:flex",
          "align-items:center",
          "gap:6px",
          "padding:0 6px",
          "border-radius:999px",
          "font-size:11px",
          "line-height:1",
          "font-variant-numeric:tabular-nums",
          "pointer-events:none",
          "white-space:nowrap",
          "background:" + OVERLAY.background,
          "color:" + OVERLAY.color,
          "border:" + OVERLAY.border,
          "box-shadow:" + OVERLAY.shadow,
          "left:0",
          "top:0"
        ].join(";");
        const swatch = document.createElement("span");
        swatch.setAttribute("data-cost-balance-picker-swatch", "1");
        swatch.style.cssText = `width:14px;height:14px;flex:none;border-radius:4px;background:${OVERLAY.surface};border:${OVERLAY.border}`;
        const hexText = document.createElement("code");
        hexText.setAttribute("data-cost-balance-picker-hex", "1");
        hexText.style.cssText = "font-size:11px;color:" + OVERLAY.secondary;
        hexText.textContent = "--";
        const hint = document.createElement("span");
        hint.setAttribute("data-cost-balance-picker-hint", "1");
        hint.style.cssText = "font-size:10px;color:" + OVERLAY.tertiary;
        hint.textContent = pickerHintLabel(t);
        chip.appendChild(swatch);
        chip.appendChild(hexText);
        chip.appendChild(hint);
        const layer = document.createElement("div");
        layer.setAttribute("data-cost-balance-picker-layer", "1");
        layer.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:" + OVERLAY_Z,
          "cursor:crosshair",
          "background:transparent",
          "touch-action:none"
        ].join(";");
        const host = document.body ?? document.documentElement ?? null;
        if (host === null || typeof host.appendChild !== "function") return false;
        host.appendChild(layer);
        host.appendChild(chip);
        const state = { doc: document, layer, chip, onMove: null, onDown: null, onContext: null, onKey: null, onResize: null };
        state.onMove = (event) => {
          const x = Number(event?.clientX);
          const y = Number(event?.clientY);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          try {
            const hex = resolveElementColor(elementFromPoint(x, y));
            if (hex !== "") {
              pickerColor = hex;
              layer.style.background = hex;
              swatch.style.background = hex;
              hexText.textContent = hex;
            }
            positionPickerChip(x, y);
          } catch {
            // A failing move must never break the mode.
          }
        };
        state.onDown = (event) => {
          const button = Number(event?.button);
          if (button === 2) {
            event.preventDefault?.();
            event.stopPropagation?.();
            disarmColorPicker();
            return;
          }
          pickerWrites = true;
          const hex = pickerColor;
          disarmColorPicker();
          if (hex === "" || typeof onPick !== "function") return;
          try {
            onPick(hex);
          } catch {
            // The panel's own failure is not the picker's.
          }
        };
        state.onContext = (event) => {
          event.preventDefault?.();
          event.stopPropagation?.();
          disarmColorPicker();
        };
        state.onKey = (event) => {
          if (String(event?.key ?? "").toLowerCase() !== "escape") return;
          event.preventDefault?.();
          event.stopPropagation?.();
          disarmColorPicker();
        };
        state.onResize = () => {
          disarmColorPicker();
        };
        if (typeof document.addEventListener !== "function") return false;
        document.addEventListener("mousemove", state.onMove, true);
        document.addEventListener("mousedown", state.onDown, true);
        document.addEventListener("contextmenu", state.onContext, true);
        document.addEventListener("keydown", state.onKey, true);
        // A resize invalidates every screen coordinate the chip carries.
        if (typeof globalThis.addEventListener === "function") globalThis.addEventListener("resize", state.onResize);
        pickerLayer = state;
        pickerChip = chip;
        pickerSwatch = swatch;
        pickerHexText = hexText;
        pickerHintText = hint;
        pickerColor = "";
        pickerWrites = false;
        return true;
      } catch {
        // A half-built picker must not stay armed.
        try {
          pickerLayer?.layer?.remove?.();
          pickerLayer?.chip?.remove?.();
        } catch {
          // Nothing more to do.
        }
        clearPickerState();
        return false;
      }
    }

    /** `document.elementFromPoint` behind a guard. */
    function elementFromPoint(x, y) {
      try {
        if (typeof document !== "object" || document === null || typeof document.elementFromPoint !== "function") return null;
        return document.elementFromPoint(x, y);
      } catch {
        return null;
      }
    }

    /**
     * Put the chip just right of and below the pointer, flipped to the other
     * side when that would leave the viewport. Uses `transform` only.
     */
    function positionPickerChip(x, y) {
      try {
        if (pickerChip === null || pickerChip === void 0) return;
        const width = typeof globalThis.innerWidth === "number" && globalThis.innerWidth > 0 ? globalThis.innerWidth : PICKER_CHIP_WIDTH + PICKER_CHIP_GAP * 2;
        const height = typeof globalThis.innerHeight === "number" && globalThis.innerHeight > 0 ? globalThis.innerHeight : PICKER_CHIP_HEIGHT + PICKER_CHIP_GAP * 2;
        const left = x + PICKER_CHIP_GAP + PICKER_CHIP_WIDTH > width ? Math.max(0, x - PICKER_CHIP_GAP - PICKER_CHIP_WIDTH) : x + PICKER_CHIP_GAP;
        const top = y + PICKER_CHIP_GAP + PICKER_CHIP_HEIGHT > height ? Math.max(0, y - PICKER_CHIP_GAP - PICKER_CHIP_HEIGHT) : y + PICKER_CHIP_GAP;
        pickerChip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      } catch {
        // Positioning is cosmetic.
      }
    }

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
     * the pill's own detail text so the old tooltip content is not lost, and —
     * last of all, below everything — the current period's official token prices
     * when the caller can state them (`priceNote`).
     */
    function PillColorPanel({ t, pillKey, tip, priceNote, anchor, resolved, phase, onAnimationEnd }) {
      // One idempotent tag carries the pop/close keyframes and the save button's
      // states; a document-less environment just gets null and renders on.
      injectOverlayStyles();
      const snapshot = import_react.default.useSyncExternalStore(
        colorStore.subscribe,
        colorStore.getSnapshot,
        colorStore.getServerSnapshot
      );
      const [target, setTarget] = import_react.default.useState("text");
      /**
       * Whether the user has touched the save button since THIS panel opened.
       * The stylesheet's save animations hang off
       * `data-cost-balance-save-state`, and a CSS animation replays for every
       * freshly mounted node: the overlay's pop-in therefore made the button pop
       * (or shake) on its own whenever the store already held "saved" from an
       * earlier auto-save or "error" from an earlier refusal. Until the user's own
       * click, the button claims no animation state at all; from that click on it
       * follows the store's real transitions (saving pulse → saved tick → error
       * shake), which are the ones that happen AFTER it. The press feedback
       * itself is the stylesheet's `:active` scale, so it needs no state.
       */
      const [saveTouched, setSaveTouched] = import_react.default.useState(false);
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
      /**
       * The animation state the button renders: nothing until this panel's own
       * save button has been clicked, then the store's real status.
       */
      const savePhase = saveTouched ? saveStatus : "idle";
      /**
       * Report the overlay once its own commit is done, so the host's diagnostics
       * route can prove the price row really reached the DOM — the desktop app's
       * renderer cannot be inspected from outside, and none of the other reports
       * (activate/mounted/painted/colour-backend) happens while a panel is open.
       * An effect runs after the commit, so `priceRows` counts this panel's row.
       */
      import_react.default.useEffect(() => {
        if (typeof priceNote === "string" && priceNote.length > 0) reportDiagnostics("overlay");
      }, [priceNote]);
      const current = resolved[target];
      // Fallback only for a colour string the wheel cannot parse; it mirrors the
      // built-in light palette's text colour.
      const rgb = hexToRgb(current) ?? { r: 15, g: 17, b: 21 };
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
      /** Top-up shortcut, offered on the overlay of EVERY pill.
       *  The host resolves the URL from the configured API base URL, so a user on a
       *  different DeepSeek endpoint lands on THAT endpoint's top-up page; with no
       *  key configured (or when the read itself failed) the payload carries no
       *  balance but still carries the sign-in page, which is where such a user has
       *  to go before paying — so the sign-in page wins there. A snapshot with no
       *  payload at all falls back to the links the last payload left behind, and
       *  the hard-coded official top-up page is the last resort. */
      const topupHref = (() => {
        const snapshot = balanceStore.getSnapshot();
        const data = snapshot?.data ?? null;
        const link = (value) => typeof value === "string" && value.length > 0 ? value : null;
        const source = { ...(snapshot?.links ?? {}), ...(data ?? {}) };
        const topUp = link(source.topUpUrl);
        const signIn = link(source.loginUrl);
        // A payload that read no balance (ok:false: no key configured, HTTP
        // failure) means signing in comes first; a read balance means paying.
        const usable = data !== null && data.ok !== false;
        return (usable ? topUp ?? signIn : signIn ?? topUp) ?? TOPUP_URL;
      })();
      const topupLink = import_react.default.createElement("a", {
        key: "topup",
        href: topupHref,
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
      }, label("colors.topup"));
      return import_react.default.createElement("div", {
        "data-cost-balance-colors": pillKey,
        // Fires for the pop and the reverse alike; the wrapper decides whether a
        // finished animation means "unmount".
        onAnimationEnd: typeof onAnimationEnd === "function" ? onAnimationEnd : void 0,
        style: {
          position: "fixed",
          top: anchor.top,
          left: anchor.left,
          zIndex: OVERLAY_Z,
          width: OVERLAY_WIDTH,
          boxSizing: "border-box",
          padding: "10px 12px 8px",
          background: OVERLAY.background,
          color: OVERLAY.color,
          border: OVERLAY.border,
          borderRadius: 12,
          boxShadow: OVERLAY.shadow,
          fontSize: 12,
          lineHeight: "18px",
          // The pop grows out of the pill and fades in; the reverse plays on the
          // way out. Both are inline (they depend on the anchor), while the
          // keyframes themselves live in the injected stylesheet.
          ...overlayPopStyle(anchor, phase)
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
              import_react.default.createElement("code", { style: { color: OVERLAY.secondary, fontSize: 11 } }, current),
              // Screen picking, right of the swatch and hex readout. This arms
              // OUR OWN mode (a transparent capture layer plus a chip that
              // follows the pointer): the native `EyeDropper` is a browser-level
              // modal that swallows every mouse event, which makes a right-click
              // cancel impossible. The button is always offered — the mode needs
              // no browser feature beyond `elementFromPoint`. Arming is fully
              // guarded: a failure leaves the panel exactly as it was.
              import_react.default.createElement("button", {
                type: "button",
                "data-cost-balance-eyedropper": "1",
                "aria-pressed": pickerArmed(),
                title: label("colors.eyedropper.tip"),
                onClick: () => {
                  try {
                    armColorPicker(t, (hex) => colorStore.setColor(scopeKey, target, hex));
                  } catch {
                    // An armed failure disarms itself; the panel stays usable.
                  }
                },
                style: {
                  marginLeft: "auto",
                  flex: "none",
                  padding: "2px 8px",
                  fontSize: 11,
                  lineHeight: "16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  color: OVERLAY.secondary,
                  background: "transparent",
                  border: OVERLAY.border
                }
              }, "\uD83D\uDD8C " + label("colors.eyedropper"))))),
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
          // makes the write immediate and reports whether the host took it. The
          // animation is driven by `data-cost-balance-save-state`, i.e. by the
          // very `save.status` this button's label and colour already follow, so
          // the motion can never claim a state the store is not in — and the state
          // is withheld until this very button is clicked, so opening the overlay
          // never animates it by itself.
          import_react.default.createElement("button", {
            type: "button",
            "data-cost-balance-save": "now",
            "data-cost-balance-save-state": savePhase,
            "aria-busy": savePhase === "saving",
            title: label("colors.save.tip"),
            onClick: () => {
              setSaveTouched(true);
              colorStore.saveNow();
            },
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
        }, tip),
        // The period's official prices, as the panel's LAST row: a price belongs
        // under the pill's own colour, never on the pill's face. Pills that pass
        // no note (the two balance pills — their tip is balance detail already)
        // end at the tip line exactly as before.
        priceNote === void 0 || priceNote === null || priceNote === ""
          ? null
          : import_react.default.createElement("div", {
              "data-cost-balance-price": pillKey,
              style: { color: OVERLAY.secondary, fontSize: 11, marginTop: 6, borderTop: OVERLAY.border, paddingTop: 6, whiteSpace: "normal" }
            }, priceNote));
    }

    /**
     * Wrap one pill: renders it with its resolved colours and opens the colour
     * overlay once the pointer has RESTED on it for `HOVER_OPEN_MS`. The delay is
     * hover intent: sweeping the pointer across the header or a turn row must not
     * throw the overlay open. The overlay is a descendant, so dragging inside it
     * keeps the surrounding hover-revealed row visible.
     *
     * `priceNote`, when the caller knows the period and the model, becomes the
     * overlay's bottom price row; every caller that cannot state it leaves the
     * panel untouched.
     */
    function ColorablePill({ t, pillKey, tip, priceNote, builtIn, className, children }) {
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
          setPanel({ anchor, mode: "opening" });
        }, HOVER_OPEN_MS);
      };
      const scheduleClose = () => {
        cancelOpen();
        cancelClose();
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          // Mark the panel as closing instead of dropping it: the panel then
          // plays its short reverse animation and removes itself when that ends.
          setPanel((open) => open !== null && open !== void 0 && open.mode !== "closing" ? { ...open, mode: "closing" } : open);
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
              priceNote,
              anchor: panel.anchor,
              phase: panel.mode,
              resolved,
              // The closing animation removed the panel: drop its own state.
              onAnimationEnd: () => {
                setPanel((open) => open !== null && open !== void 0 && open.mode === "closing" ? null : open);
              }
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
      // The official prices of this period go to the BOTTOM of the overlay, not
      // onto the pill's face. Every branch fills it: this model's own rates, the
      // flat statement for a non-DeepSeek model, or — when no model can be
      // resolved at all — the current period's official list for the DeepSeek
      // models, so the panel's last block is never missing.
      let priceNote;
      if (isOther) {
        // Non-DeepSeek models have no peak/off-peak scheme: the bottom row states
        // that rather than a period price, and the tip keeps the flat rates.
        const otherPrices = modelPrices(current?.model, period);
        tip = `${t("tip.other", { model: current?.model ?? "?" })}${otherPrices === null ? "" : ` \u00B7 ${t("tip.price", { input: formatPrice(otherPrices.input), output: formatPrice(otherPrices.output), cacheHitInput: formatPrice(otherPrices.cacheHitInput) })}`} \u00B7 ${t("tip.now", { time: formatBeijingClock(now) })}`;
        label = t("badge.other");
        builtIn = DEFAULT_PILL_COLORS.neutral;
        priceNote = flatPriceNoteFor(t, current?.model);
      } else {
        const countdown = formatCountdown(nextTransitionInMinutes(now));
        tip = `${t("tip." + period)} \u00B7 ${t("tip.next", { countdown })} \u00B7 ${t("tip.now", { time: formatBeijingClock(now) })}`;
        // The label is the period and the countdown only — the colour overlay's
        // bottom row is the one place that prints prices.
        label = t("badge." + period) + t("badge.next", { countdown });
        builtIn = period === "peak" ? DEFAULT_PILL_COLORS.alert : DEFAULT_PILL_COLORS.neutral;
        // The row ALWAYS renders. This model's own prices when the table has
        // them; otherwise the current period's official list for the DeepSeek
        // models, because a session whose model never resolved (the desktop
        // app's usual case) must still show real numbers rather than nothing.
        const prices = current?.model === void 0 || current?.model === null ? null : modelPrices(current.model, period);
        priceNote = prices === null ? officialPriceNoteFor(t, period) : priceNoteFor(t, current.model, period);
      }
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: "peak",
        tip,
        priceNote,
        builtIn,
        className: "dsh-peak-indicator-badge"
      }, label);
    }

    /**
     * The header pill that merges the two money figures into one capsule:
     * "本会话 ¥0.94 · 余额 ¥29.33". The session spend comes from the `peakCost`
     * projection, the balance from the shared balance store, and whichever part
     * has nothing to say is simply left out (no spend yet, unreadable balance).
     * Its built-in colour follows the balance state — muted while unknown, red
     * below the low-balance threshold, the built-in light palette otherwise —
     * because the peak/off-peak colouring now belongs to the period pill beside it.
     * It passes no `priceNote`: its overlay is balance detail, and a second price
     * row there would only repeat the period pill's.
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
     * period-coloured pill like the header badge (the built-in light palette, red
     * during a peak period).
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
      // The chip knows its own period, so its overlay gets the same bottom price
      // row as the header pill's — for the period that turn was billed in.
      const priceNote = isDS ? priceNoteFor(t, entry.model, chipPeriod) : flatPriceNoteFor(t, entry.model);
      return import_react.default.createElement(ColorablePill, {
        t,
        pillKey: "turnCost",
        tip: t("turn.tip"),
        priceNote,
        builtIn: !isDS || chipPeriod === "offpeak" ? DEFAULT_PILL_COLORS.neutral : DEFAULT_PILL_COLORS.alert,
        className: "dsh-peak-indicator-turn-cost"
      }, t("turn.cost", { amount: cost.toFixed(2) }));
    }

    /**
     * The balance pill. Registered twice with the same component: in the
     * session header, immediately right of the peak/off-peak badge, and in the
     * turn-tail actions row, immediately right of the per-turn price chip — so
     * both places show an identical pill. It passes no `priceNote` on purpose:
     * its overlay already carries the balance detail, and the price row is the
     * period pill's and the turn chip's.
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

    // NOTHING is required here on purpose. The desktop shell aborts its ENTIRE
    // boot when one client entry stays pending — the real crash was
    // `web boot: 1 entry did not activate / dsh-cost-balance-indicator: pending
    // (waiting for service: settingsScope)` — so every service is now waited for
    // inside a `ctx.inject` sub-fiber, which never marks the entry pending. The
    // pills appear as soon as the slot registry is up; a service this build does
    // not offer costs its own surface and nothing else.
    var inject = [];

    /** Run `callback` once every service is available, or immediately as a fallback. */
    function whenReady(ctx, deps, callback) {
      try {
        if (typeof ctx.inject === "function") {
          ctx.inject(deps, callback);
          return;
        }
      } catch {
        // No waiting facility in this client: fall through and try right now.
      }
      try {
        callback(ctx);
      } catch (error) {
        ctx.logger?.warn?.(`cost-balance-indicator: ${deps.join("/")} is unavailable (${error.message ?? error})`);
      }
    }

    /**
     * Read one client service without requiring it.
     * @returns the service, or null when this composition does not offer it.
     */
    function optionalService(ctx, name) {
      try {
        const value = typeof ctx.get === "function" ? ctx.get(name) : ctx[name];
        return value === void 0 || value === null ? null : value;
      } catch {
        return null;
      }
    }

    /**
     * Build a settings backend over the client's own `remote.settings` RPC from
     * an ALREADY-RESOLVED service object. Exposes `getSnapshot()` /
     * `subscribe()` / `set(field, value)`.
     *
     * `remote.settings` offers THREE ways to persist a field, in decreasing
     * precision: `mutate(ns, ops, expectedRevision)` (path-addressed edits),
     * `update(ns, patch, expectedRevision)` (merge a patch) and `replace(ns,
     * section, expectedRevision)` (restate the whole section). A newer bundled
     * core refuses a namespace whose plugin declared no volatile field, and it
     * does so inside the shared write path — so a refusal from one method is not
     * necessarily a refusal from the next: the fallback chain is what turns a
     * refused `mutate` into a persisted palette where the host accepts another
     * method. The method whose reply carried `ok: true` is recorded in the
     * self-report (`diagWarnings`' sibling `writeAttempts`), together with the
     * RAW code+message of every refusal, so the app's real write path is provable
     * from outside. A method this client does not offer is skipped, not fatal.
     *
     * `replace` restates the whole section, so the current one is merged with the
     * field under a shallow spread — never the whole document, only this plugin's
     * own namespace.
     *
     * `remote.settings` is a NAMESPACED service: Cordis refuses to read it from a
     * context that did not inject it (`cannot get property "remote.settings"
     * without inject`), so the service must be resolved first (see
     * resolveRemoteSettings) and handed in here. That keeps a wrong caller from
     * taking the whole mount down with it — which is exactly what happened in the
     * desktop app before 0.7.0's fix.
     *
     * @returns the backend, or null when the argument is not a settings RPC.
     */
    function createRemoteSettingsBackend(settings, namespace) {
      if (settings === null || typeof settings !== "object") return null;
      if (typeof settings.describe !== "function") return null;
      // At least one write method must exist; the rest are used when present.
      if (typeof settings.mutate !== "function" && typeof settings.update !== "function" && typeof settings.replace !== "function") return null;
      const listeners = /* @__PURE__ */ new Set();
      let state = { status: "loading", value: void 0, writable: true, revision: void 0 };
      /** The last section this module itself wrote, the best `replace` base. */
      let lastWritten;
      const publish = (next) => {
        state = next;
        for (const listener of [...listeners]) {
          try {
            listener();
          } catch {
            // One broken subscriber must not stop the others.
          }
        }
      };
      /** Publish a successful write's namespace view and remember the section. */
      const accept = (view, written) => {
        lastWritten = written;
        if (view !== void 0 && view !== null) {
          publish({ status: "ready", value: view.value, writable: true, revision: view.revision });
        } else {
          publish({ ...state, status: "ready", writable: true });
        }
      };
      const describe = async () => {
        try {
          const response = await settings.describe();
          if (response?.ok !== true) {
            publish({ ...state, status: "unavailable", writable: false });
            return;
          }
          const value = response.value ?? {};
          const view = Array.isArray(value.namespaces) ? value.namespaces.find((entry) => entry?.ns === namespace) : void 0;
          // The host's own view of this namespace: `applies` + `revision` + the
          // raw key names only. A missing entry is itself the answer ("the host
          // does not advertise this namespace at all"), so it is recorded too.
          remoteNamespaceView = view === void 0
            ? { ns: namespace, found: false }
            : {
              ns: namespace,
              found: true,
              applies: view.applies ?? null,
              revision: view.revision ?? null,
              entryKeys: objectKeys(view),
              valueKeys: objectKeys(view.value)
            };
          publish({
            status: view === void 0 ? "loading" : "ready",
            value: view?.value,
            writable: value.writable !== false,
            revision: view?.revision
          });
        } catch {
          publish({ ...state, status: "unavailable", writable: false });
        }
      };
      /** One `mutate` reply: path-addressed edit of the single field. */
      const applyMutate = async (field, value) => {
        if (typeof settings.mutate !== "function") return { skipped: true };
        const response = await settings.mutate(namespace, [{ op: "set", path: [field], value }], state.revision);
        if (response?.ok === true) accept(response.value, { ...(state.value ?? {}), [field]: value });
        return { response };
      };
      /** One `update` reply: merge a one-field patch into the section. */
      const applyUpdate = async (field, value) => {
        if (typeof settings.update !== "function") return { skipped: true };
        const response = await settings.update(namespace, { [field]: value }, state.revision);
        if (response?.ok === true) accept(response.value, { ...(state.value ?? {}), [field]: value });
        return { response };
      };
      /** One `replace` reply: restate the current section plus this field. */
      const applyReplace = async (field, value) => {
        if (typeof settings.replace !== "function") return { skipped: true };
        const live = objectKeys(state.value) !== null ? state.value : void 0;
        const section = { ...(live ?? lastWritten ?? {}), [field]: value };
        const response = await settings.replace(namespace, section, state.revision);
        if (response?.ok === true) accept(response.value, section);
        return { response };
      };
      const methods = [
        ["mutate", applyMutate],
        ["update", applyUpdate],
        ["replace", applyReplace]
      ];
      const write = async (field, value, attempt) => {
        let lastError;
        for (const [method, call] of methods) {
          let outcome;
          try {
            outcome = await call(field, value);
          } catch (error) {
            // A transport-level throw is that method's outcome, not a fatal one.
            noteWriteAttempt({
              method,
              accepted: false,
              code: "settings/transport",
              message: String(error?.message ?? error),
              revision: state.revision ?? null
            });
            lastError = { code: "settings/transport", message: String(error?.message ?? error) };
            continue;
          }
          if (outcome.skipped === true) continue;
          const response = outcome.response;
          if (response?.ok === true) {
            remoteWriteMethod = method;
            noteWriteAttempt({ method, accepted: true, code: null, message: "", revision: state.revision ?? null });
            return;
          }
          const error = response?.error ?? {};
          // A stale revision is its own outcome, not a refusal: re-read and retry
          // the SAME method once, before any fallback is considered.
          if (attempt === 0 && (error.code === "settings/conflict" || error.details?.actual !== void 0)) {
            noteWriteAttempt({
              method,
              accepted: false,
              code: error.code ?? "settings/conflict",
              message: error.message ?? "stale revision",
              revision: state.revision ?? null
            });
            await describe();
            return write(field, value, attempt + 1);
          }
          // The refusal is recorded RAW: the host's own code and message, which is
          // what `settings/rejected: Plugin entry "…" has no volatile fields` is.
          noteWriteAttempt({
            method,
            accepted: false,
            code: error.code ?? "settings/rejected",
            message: error.message ?? "the settings provider refused the write",
            revision: state.revision ?? null
          });
          lastError = error;
        }
        throw new Error(`${lastError?.code ?? "settings/rejected"}: ${lastError?.message ?? "the settings provider refused the write"}`);
      };
      describe();
      return {
        kind: "remote-rpc",
        getSnapshot: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        set: (field, value) => write(field, value, 0),
        refresh: describe
      };
    }

    /**
     * Resolve the `remote.settings` service WITHOUT requiring an injection, using
     * whichever facility this client actually offers. Every step is guarded: a
     * namespaced read throws in Cordis, and that throw must never escape.
     *
     * The order is the one that costs the least when the service is not there
     * yet: the two synchronous reads first (`ctx.get`, then a guarded property
     * read), and only then the injection, which is asynchronous and therefore
     * cannot be observed by this call. `resolveRemoteSettingsAsync` runs that
     * injection when the synchronous reads came up empty.
     *
     * @returns `{ service, via }` — `via` is one of `ctx.get("remote.settings")`,
     * `ctx.remote.settings`, `inject(remote.settings)` or `none`, and is recorded
     * in the self-report so the working path is provable.
     */
    function resolveRemoteSettings(ctx) {
      const attempt = {};
      try {
        if (typeof ctx?.get === "function") {
          const service = ctx.get("remote.settings");
          if (service !== void 0 && service !== null) return { service, via: 'ctx.get("remote.settings")' };
        }
      } catch (error) {
        attempt.getError = `ctx.get: ${error?.message ?? error}`;
      }
      try {
        const service = ctx?.remote?.settings ?? null;
        if (service !== null && service !== void 0) return { service, via: "ctx.remote.settings" };
      } catch (error) {
        // The desktop app's exact shape: reading the namespaced property off a
        // context that did not inject it throws. Recorded, never re-thrown.
        attempt.propertyError = `ctx.remote.settings: ${error?.message ?? error}`;
      }
      return { service: null, via: "none", ...attempt };
    }

    /** True when this context can still come up with the service later on. */
    function canResolveRemoteLater(ctx) {
      if (typeof ctx?.inject === "function" || typeof ctx?.get === "function") return true;
      try {
        return ctx?.remote != null;
      } catch {
        return false;
      }
    }

    /** Remember every failed resolution path once, for the report. */
    function noteRemoteResolution(attempt, via) {
      const message = attempt.propertyError ?? attempt.getError;
      if (typeof message === "string" && !diagWarnings.includes(message)) diagWarnings.push(message);
      remoteResolveNotes.push(via);
      if (remoteResolveNotes.length > 12) remoteResolveNotes.splice(0, remoteResolveNotes.length - 12);
    }

    /** How long to keep retrying the resolution, and how often. */
    var REMOTE_RETRY_DELAYS = [120, 300, 800, 1500, 2600];

    /**
     * Bind the colour store through whichever settings backend this client
     * offers, preferring the plugin's own settings scope and falling back to the
     * public `remote.settings` RPC — the desktop app's only settings surface.
     *
     * The RPC service comes up asynchronously and its namespaced read throws
     * without an injection, so a single attempt is not enough: every path is
     * tried, and while one might still appear the attempt is repeated on a timer.
     * Nothing here may throw — a failure costs the palette's persistence, never
     * the mount (which is how the app lost all four pills in 0.7.0).
     */
    function bindColorBackendViaRpc(ctx) {
      if (colorBackendKind === "scope-binder" || colorBackendKind === "remote-rpc") return;
      let retry = 0;
      let resetTimer = null;
      let injectRequested = false;
      const attempt = (current) => {
        if (colorBackendKind === "remote-rpc") return;
        remoteResolveAttempts += 1;
        try {
          const resolved = resolveRemoteSettings(current);
          if (resolved.service !== null && colorStore.bindRemoteBackend(resolved.service, resolved.via)) {
            colorRemoteResolvedVia = resolved.via;
            if (resetTimer !== null) {
              clearTimeout(resetTimer);
              resetTimer = null;
            }
            reportDiagnostics("color-backend");
            return;
          }
          remoteResolveNulls += 1;
          noteRemoteResolution(resolved, resolved.via);
        } catch (error) {
          remoteResolveNulls += 1;
          const message = `remote.settings resolution threw: ${error?.message ?? error}`;
          if (!diagWarnings.includes(message)) diagWarnings.push(message);
        }
        // The asynchronous path: `ctx.inject` runs the callback in a sub-fiber
        // once the service is up, which never holds this entry pending. It is
        // re-requested on every attempt on purpose — a client that ignores the
        // request while the service is still coming up would otherwise never be
        // asked again, which is how the palette stayed in browser storage.
        if (typeof current.inject === "function") {
          injectRequested = true;
          try {
            current.inject(["remote.settings"], (scope) => {
              try {
                const service = scope?.remote?.settings ?? null;
                if (service !== null && service !== void 0) colorStore.bindRemoteBackend(service, "inject(remote.settings)");
              } catch (error) {
                const message = `injected remote.settings read threw: ${error?.message ?? error}`;
                if (!diagWarnings.includes(message)) diagWarnings.push(message);
              }
            });
          } catch (error) {
            const message = `ctx.inject(remote.settings) is unavailable: ${error?.message ?? error}`;
            if (!diagWarnings.includes(message)) diagWarnings.push(message);
          }
        }
        if (retry < REMOTE_RETRY_DELAYS.length && canResolveRemoteLater(current)) {
          const delay = REMOTE_RETRY_DELAYS[retry];
          retry += 1;
          try {
            setTimeout(() => attempt(current), delay);
            return;
          } catch {
            // No timers here: the attempts so far stay in the report.
          }
        }
        reportDiagnostics("color-backend");
      };
      attempt(ctx);
    }

    /** Bind one backend to the colour store and remember which kind it is. */
    function bindColorBackend(kind, backend) {
      colorBackendKind = kind;
      colorStore.bindScope(backend, kind);
      // The settings cards need the same scope, so they are registered as soon as
      // one exists — which for the RPC path is several ticks after the mount.
      try {
        colorCardsMounter?.(backend);
      } catch (error) {
        const message = `settings cards failed to mount: ${error?.message ?? error}`;
        if (!diagWarnings.includes(message)) diagWarnings.push(message);
      }
    }

    /**
     * Bind this plugin's colour settings scope through the binder this client
     * provides. Without one the colour store stays unbound here and the RPC
     * backend is mounted instead (see mountSurfaces): `remote.settings` is
     * namespaced and must never be read outside a resolution that tolerates the
     * Cordis injection guard.
     * @returns the bound scope, or null when only the RPC path is available.
     */
    function bindColorScope(ctx) {
      const service = optionalService(ctx, "settingsScope");
      if (service !== null && typeof service.bind === "function") {
        try {
          const scope = service.bind({ namespace: "cost-balance-indicator" });
          if (scope !== null && scope !== void 0) {
            bindColorBackend("scope-binder", scope);
            return scope;
          }
        } catch (error) {
          // Fall through: the caller mounts the RPC backend instead.
          const message = `settingsScope.bind failed: ${error?.message ?? error}`;
          if (!diagWarnings.includes(message)) diagWarnings.push(message);
        }
      }
      return null;
    }

    /**
     * Register one slot, tolerating a client surface that renamed or dropped it.
     * The desktop shell and newer bundled cores are the reason: one missing slot
     * must cost that one surface, never the whole browser half (which would also
     * take the balance pill and the colour store down with it).
     */
    function registerSlot(ctx, name, options, Component) {
      try {
        ctx.slots.inject(name, () => ctx.slots.register(options, Component));
        diagRegistered.push(String(options?.id ?? name));
        return true;
      } catch (error) {
        const message = `slot ${name} is unavailable: ${error.message ?? error}`;
        ctx.logger?.warn?.(`cost-balance-indicator: ${message}`);
        diagWarnings.push(message);
        return false;
      }
    }

    /** Guards record what they swallowed, so the report below can carry it. */
    var diagWarnings = [];
    /** Slot ids this half managed to register, in order. */
    var diagRegistered = [];
    /** Where the browser half posts its own report (readable over HTTP). */
    var DIAG_PATH = "/api/cost-balance-indicator.diag";

    /**
     * The whole self-report, as one object.
     *
     * A browser shell whose renderer cannot be inspected from outside (the desktop
     * app) gives a plugin no other way to say why it rendered nothing: a missing
     * service or an unavailable slot is swallowed by the guards. The payload
     * carries flags, counts and warnings only — no user data, no credentials.
     *
     * The colour-store block is what makes the palette explain itself: whether a
     * backend bound at all, which kind it is (`scope-binder` / `remote-rpc` /
     * `none`), whether it is writable, the overlay's own `save.status` and
     * `save.message`, which resolution path won, and how often the RPC backend was
     * attempted and came up empty.
     */
    function diagState(phase) {
      const hasDocument = typeof document === "object" && document !== null;
      const countOf = (selector) => (hasDocument ? document.querySelectorAll(selector).length : -1);
      const store = colorStore.saveStatus();
      return {
        phase: typeof phase === "string" ? phase : "snapshot",
        source: "cost-balance-indicator/client",
        url: typeof location === "object" && location !== null ? `${location.protocol}//${location.host}${location.pathname}` : "?",
        registered: diagRegistered.slice(),
        warnings: diagWarnings.slice(0, 12),
        domPills: countOf("[class*=cost-balance-indicator]"),
        domPeriodPill: countOf(".dsh-peak-indicator-badge"),
        domTurnChip: countOf(".dsh-peak-indicator-turn-cost"),
        /**
         * How many overlay price rows exist in the DOM. The period pill's row is
         * the feature that used to be missing (a directory that never resolved
         * left it empty), so this counter is what proves it renders in the
         * running app, where the renderer cannot be inspected from outside.
         */
        priceRows: countOf("[data-cost-balance-price]"),
        domHeaderSlots: countOf("[class*=header]"),
        colorBackendBound: store.bound,
        colorBackendKind: store.kind,
        colorBackendWritable: store.writable,
        colorBackendResolvedVia: store.resolvedVia,
        colorSaveStatus: store.status,
        colorSaveMessage: store.message,
        colorRpcAttempts: store.remoteAttempts,
        colorRpcNulls: store.remoteNulls,
        colorResolveNotes: store.notes,
        /** The write method the host accepted, plus every raw refusal. */
        colorWriteMethod: store.writeMethod,
        colorWriteAttempts: store.writeAttempts,
        colorWriteBuild: REMOTE_WRITE_BUILD,
        /** The host's own view of this namespace (keys/applies/revision only). */
        colorNamespace: store.namespace
      };
    }

    /**
     * Post one report about this half's own activation to the host route above.
     * Every field travels in `diagState()`, so a test can assert the payload
     * without a network round trip.
     */
    function reportDiagnostics(phase) {
      try {
        if (typeof fetch !== "function") return diagState(phase);
        const body = JSON.stringify(diagState(phase));
        fetch(DIAG_PATH, { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {});
        return body;
      } catch {
        // Diagnostics must never break the plugin.
        return null;
      }
    }

    function apply(ctx) {
      // Dictionaries wait for the locale service; the pills wait for the slot
      // registry. Neither wait can hold the plugin entry in `pending`.
      whenReady(ctx, ["locale"], (localeScope) => {
        localeScope.effect(() => localeScope.locale.register(NS_PEAK, { zh, en }), "cost-balance-indicator: pricing dictionaries");
        localeScope.effect(() => localeScope.locale.register(NS_BALANCE, { zh: zhBalanceFull, en: enBalanceFull }), "cost-balance-indicator: balance dictionaries");
      });
      ctx.effect(() => () => balanceStore.stopPolling(), "cost-balance-indicator: poll timer");
      // Report now ("did the entry activate at all?") and again after the UI has
      // had time to paint ("did the pills reach the DOM?").
      reportDiagnostics("activate");
      try {
        setTimeout(() => reportDiagnostics("painted"), 4000);
      } catch {
        // No timers here: the first report already went out.
      }
      whenReady(ctx, ["slots"], (scope) => {
        try {
          mountSurfaces(scope);
          diagWarnings.push("mountSurfaces returned");
        } catch (error) {
          diagWarnings.push(`mountSurfaces threw: ${error?.message ?? error}`);
        }
        reportDiagnostics("mounted");
      });
    }

    /** Mount every pill, the optional settings cards and the colour store binding. */
    function mountSurfaces(ctx) {
      // The settings cards need whatever settings backend ends up bound, and the
      // RPC backend binds asynchronously; registering the mounter first means the
      // cards land as soon as the backend does.
      colorCardsMounter = (scope) => {
        for (const [slotName, options] of [
          ["settings.plugin.item", {
            name: "settings.plugin.item",
            id: "cost-balance-indicator-compaction",
            key: "cost-balance-indicator",
            order: 40,
            locale: NS_PEAK
          }],
          ["settings.general.item", {
            name: "settings.general.item",
            id: "cost-balance-indicator-compaction-general",
            order: 40,
            locale: NS_PEAK
          }]
        ]) {
          registerSlot(ctx, slotName, { ...options, inject: () => ({ scope }) }, CompactSettingsRow);
        }
      };
      // The colour section lives in the plugin's own settings namespace, so a
      // chosen palette survives a restart and reaches every open tab.
      let colorSettingsScope = bindColorScope(ctx);
      if (colorSettingsScope === null) {
        // No scope binder (the desktop app): persist through the settings RPC.
        // `remote.settings` is namespaced, so it must never be read off the plain
        // plugin context without a guard — that read throws
        // `cannot get property "remote.settings" without inject` and used to abort
        // this whole mount, leaving the app with no pills at all. The resolution
        // in `bindColorBackendViaRpc` tries every facility (ctx.get, the guarded
        // property read and ctx.inject) and retries while one might still appear.
        bindColorBackendViaRpc(ctx);
      }
      // Session header, left to right: the merged spend+balance pill (20), then
      // the billing-period pill (21) that used to carry the cost itself.
      registerSlot(ctx, "conversation.session.header.actions", {
        name: "conversation.session.header.actions",
        id: "cost-balance-indicator-header",
        order: 20,
        locale: NS_BALANCE,
        inject: () => ({ pillKey: "headerBalance" })
      }, HeaderSpend);
      registerSlot(ctx, "conversation.session.header.actions", {
        name: "conversation.session.header.actions",
        id: "cost-balance-indicator-peak",
        order: 21,
        locale: NS_PEAK,
        inject: (sessionId) => {
          try {
            const directories = optionalService(ctx, "modelDirectories");
            if (directories === null || typeof directories.directoryFor !== "function") return { directory: null };
            const directory = directories.directoryFor(sessionId);
            return {
              directory: directory.store,
              load: () => directory.load().catch(() => {})
            };
          } catch {
            return { directory: null };
          }
        }
      }, PeriodBadge);
      // Turn tail: per-turn price chip (100) then the same balance pill (101).
      registerSlot(ctx, "conversation.chat.assistant-actions", {
        name: "conversation.chat.assistant-actions",
        id: "cost-balance-indicator-turn",
        order: 100,
        locale: NS_PEAK
      }, TurnCost);
      registerSlot(ctx, "conversation.chat.assistant-actions", {
        name: "conversation.chat.assistant-actions",
        id: "cost-balance-indicator-balance",
        order: 101,
        locale: NS_BALANCE,
        inject: () => ({ pillKey: "turnBalance" })
      }, BalanceChip);
    }
    var client_default = { apply, inject };
    //#endregion

    return module.exports;
  }
});
