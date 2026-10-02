// Compare this plugin's client module entry in the boot graph with the app's own
// client modules: same metadata shape, same activation policy?
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 || args[at + 1] === void 0 ? fallback : args[at + 1];
};
const host = option("host", "127.0.0.1");
const port = option("port", "19387");
const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
const base64url = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
const block = /client-connection\/browser-session:([\s\S]*?)(?:\n\S|$)/.exec(text);
const secret = Buffer.from(/secret:\s*['"]?([A-Za-z0-9_-]+)['"]?/.exec(block[1])[1].replaceAll("-", "+").replaceAll("_", "/"), "base64");
const authority = `${host}:${port}`;
const cookieName = "dsh-auth-" + base64url(createHash("sha256").update(authority).digest());
const issuedAt = Date.now();
const body = base64url(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt: issuedAt + 86400000 }), "utf8"));
const cookie = `${cookieName}=v1.${body}.${base64url(createHmac("sha256", secret).update(body).digest())}`;

const html = await (await fetch(`http://${authority}/`, { headers: { cookie } })).text();
// The boot blob is a JSON object assigned to window.__DSH_BOOT__.
const at = html.indexOf("__DSH_BOOT__");
console.log(`boot blob at ${at}; page ${html.length} bytes`);
const start = html.indexOf("{", at);
if (start === -1) {
  console.log("no boot blob object found");
  process.exitCode = 1;
} else {
  // Brace-match the blob, ignoring braces inside strings.
  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  const blob = JSON.parse(html.slice(start, end));
  console.log(`boot blob keys: ${Object.keys(blob).join(", ")}`);
  const list = blob.entries ?? blob.clientModules ?? blob.modules ?? [];
  console.log(`module entries: ${Array.isArray(list) ? list.length : typeof list}`);
  const ids = new Set((Array.isArray(list) ? list : []).map((entry) => entry.id ?? entry.name ?? ""));
  const mine = (Array.isArray(list) ? list : []).find((entry) => (entry.id ?? "").includes("cost-balance"));
  if (mine !== void 0) {
    const deps = mine.inject ?? [];
    console.log(`\nmy entry: ${mine.id}  url=${mine.url}`);
    for (const dep of deps) console.log(`  inject ${dep}: ${ids.has(dep) ? "PRESENT in graph" : "*** MISSING from graph ***"}`);
  }
  console.log("\nids containing 'slot' or 'model-selection' or 'locale' or 'ui-conversation':");
  for (const id of [...ids].filter((value) => /slot|model-selection|locale|ui-conversation/.test(value)).sort()) console.log(`  ${id}`);
  const entries = Array.isArray(list) ? list : Object.entries(list).map(([id, value]) => ({ id, ...value }));
  for (const entry of entries) {
    const id = entry.id ?? entry.name ?? "";
    if (id.includes("cost-balance") || id.includes("ui-theme") || id.includes("ui-chat")) {
      console.log(`\n${id}:\n  ${JSON.stringify(entry)}`);
    }
  }
}
