// Screenshot one page of a running DSH instance through Edge's DevTools
// protocol, optionally hovering an element first so a hover-only overlay is
// captured. Built for visual verification of the colour overlay, which unit
// tests can only assert structurally.
//
// Prerequisites: Edge started with --remote-debugging-port=<port> (any window,
// headed or headless) and a page already open on the app.
//
//   node verify/shot.mjs --out shot.png
//   node verify/shot.mjs --out shot.png --hover .dsh-cost-balance-indicator-balance
//   node verify/shot.mjs --out shot.png --hover .dsh-peak-indicator-badge --eval "document.querySelectorAll('input[type=range]').length"
//   node verify/shot.mjs --out shot.png --width 900 --height 1200 --wait 6000
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 || args[at + 1] === void 0 ? fallback : args[at + 1];
};
const port = option("port", "9222");
const out = option("out", "shot.png");
const hover = option("hover", "");
const evaluate = option("eval", "");
const evalFile = option("eval-file", "");
const preEvalFile = option("pre-eval-file", "");
const preWaitMs = Number(option("pre-wait", "3000"));
/** How long to wait after dispatching the hover before reading the page. */
const hoverWaitMs = Number(option("wait-after-hover", "600"));
const reload = args.includes("--reload");
const url = option("url", "");
const match = option("match", "127.0.0.1");
const width = Number(option("width", "1400"));
const height = Number(option("height", "900"));
const waitMs = Number(option("wait", "8000"));
/** Optional x,y,w,h clip in CSS pixels, captured at `--scale` for close-ups. */
const clip = option("clip", "") === "" ? null : option("clip", "").split(",").map(Number);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pick the tab showing the app. Edge opens its own first-run page, and that tab
 * is the first `page` target, so match by URL instead of taking the first one.
 */
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
let target = targets.find((entry) => entry.type === "page" && entry.url.includes(match));
if (target === void 0 && url !== "") {
  // Newer Edge versions require PUT for /json/new.
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  target = created.ok ? await created.json() : void 0;
}
if (target === void 0) {
  throw new Error(`no page target matching "${match}"; open one (or pass --url) and retry`);
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let counter = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (entry === void 0) return;
  pending.delete(message.id);
  if (message.error !== void 0) entry.reject(new Error(JSON.stringify(message.error)));
  else entry.resolve(message.result);
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve);
  socket.addEventListener("error", () => reject(new Error("cannot reach the DevTools websocket")));
});
const send = (method, params) => new Promise((resolve, reject) => {
  const id = ++counter;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
if (args.includes("--no-cache")) {
  // Without this the page keeps executing the bundle it cached under the old
  // revision, and a changed plugin looks like it never took effect.
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
}
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: false });
// `--goto` forces a fresh document (a dynamic index is served no-store), which
// is what picks up a rebuilt plugin bundle; `--reload` only re-requests it.
const goto = option("goto", "");
if (goto !== "") {
  await send("Page.navigate", { url: goto });
  await sleep(Math.max(waitMs, 3000));
} else if (reload) {
  await send("Page.reload", { ignoreCache: true });
}
await sleep(waitMs);

/** Evaluate one expression and report what it returned (or threw). */
async function run(expression, tag) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails !== void 0) {
    const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    console.log(`${tag} threw -> ${String(detail).split("\n")[0]}`);
    return void 0;
  }
  console.log(`${tag} -> ${JSON.stringify(result.result?.value)}`);
  return result.result?.value;
}

// Steps that must happen before the hover (open a session, expand a panel, ...).
if (preEvalFile !== "") {
  await run(readFileSync(preEvalFile, "utf8"), "pre-eval");
  await sleep(preWaitMs);
}

/** Dispatch the mouse events React turns into onMouseEnter. */
async function hoverElement(selector) {
  const expression = `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (el === null) return "missing";
    const r = el.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    el.dispatchEvent(new MouseEvent("mouseover", init));
    el.dispatchEvent(new MouseEvent("mouseenter", init));
    el.dispatchEvent(new MouseEvent("mousemove", init));
    return "hovered";
  })()`;
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result?.value;
}

if (hover !== "") {
  const first = await hoverElement(hover);
  console.log(`hover ${hover} -> ${first}`);
  // `--wait-after-hover` is what makes the hover-intent delay measurable: probe
  // at 200ms to see the overlay still closed, at 900ms to see it open.
  await sleep(hoverWaitMs);
}

if (evaluate !== "" || evalFile !== "") {
  const expression = evalFile !== "" ? readFileSync(evalFile, "utf8") : evaluate;
  await run(expression, "eval");
}

const shot = await send("Page.captureScreenshot", {
  format: "png",
  ...(clip === null ? {} : { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3], scale: Number(option("scale", "4")) } })
});
writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log(`screenshot -> ${out} (${width}x${height} css px${clip === null ? "" : `, clipped ${clip.join(",")}`})`);
socket.close();
