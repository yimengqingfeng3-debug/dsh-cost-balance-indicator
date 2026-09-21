// Open this conversation's session in a browser driven through verify/shot.mjs,
// so the header/turn pills exist to hover. Pair it with --pre-eval-file:
//
//   node verify/shot.mjs --no-cache --reload --out wheel.png \
//     --pre-eval-file verify/open-session.js --pre-wait 7000 \
//     --hover ".dsh-cost-balance-indicator-balance" --clip 555,119,124,124 --scale 4
//
// It clicks the sidebar row whose title matches NEEDLE (default: this plugin's
// conversation) and falls back to the first session row when none matches.
(() => {
  const needle = "显示余额插件";
  const rows = [...document.querySelectorAll("div[class*=sessionRow]")];
  if (rows.length === 0) return "no session rows yet - raise --pre-wait";
  const row = rows.find((el) => (el.textContent || "").includes(needle)) || rows[0];
  const rect = row.getBoundingClientRect();
  const init = { bubbles: true, cancelable: true, clientX: rect.left + 20, clientY: rect.top + rect.height / 2, button: 0 };
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    const Ctor = type.startsWith("pointer") ? PointerEvent : MouseEvent;
    row.dispatchEvent(new Ctor(type, init));
  }
  return `clicked "${(row.textContent || "").trim().slice(0, 20)}"`;
})()
