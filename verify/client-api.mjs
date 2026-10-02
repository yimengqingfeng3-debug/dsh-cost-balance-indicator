// Read what a RUNNING DSH client actually offers.
//
// The desktop app bundles its own client core, and it differs from the CLI's: it
// provides `settingsSchema` where the CLI provides `settingsScope`, and its
// settings UI drives the `remote.settings` RPC directly. Guessing that shape is
// how 0.7.0 broke the app's boot, so this tool reads it instead:
//
//   node verify/client-api.mjs --port 19387                 # service + remote map
//   node verify/client-api.mjs --port 19387 --grep settings # also show contexts
//
// It mints the same signed cookie as the GUI (HMAC over the
// `client-connection/browser-session` credential) and prints identifiers only,
// never a secret.
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
const needle = option("grep", "");
const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
const base64url = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

function readSessionSecret() {
  const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
  const block = /client-connection\/browser-session:([\s\S]*?)(?:\n\S|$)/.exec(text);
  if (block === null) throw new Error("no client-connection/browser-session record in the credential store");
  const secret = /secret:\s*['"]?([A-Za-z0-9_-]+)['"]?/.exec(block[1]);
  if (secret === null) throw new Error("the browser-session record carries no secret");
  return Buffer.from(secret[1].replaceAll("-", "+").replaceAll("_", "/"), "base64");
}

const authority = `${host}:${port}`;
const secret = readSessionSecret();
const cookieName = "dsh-auth-" + base64url(createHash("sha256").update(authority).digest());
const issuedAt = Date.now();
const body = base64url(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt: issuedAt + 86400000 }), "utf8"));
const cookie = `${cookieName}=v1.${body}.${base64url(createHmac("sha256", secret).update(body).digest())}`;
const get = (path) => fetch(`http://${authority}${path}`, { headers: { cookie } });

const page = await get("/");
const html = await page.text();
console.log(`GET / -> ${page.status}, ${html.length} bytes`);
const combos = [...new Set([...html.matchAll(/(?:src|href)="(plugins\/\?\?[^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))];
console.log(`client bundles referenced: ${combos.length}`);

const services = new Set();
const provided = new Set();
const remotes = new Set();
let bytes = 0;
for (const combo of combos) {
  const response = await get(`/${combo}`);
  if (!response.ok) continue;
  const text = await response.text();
  bytes += text.length;
  for (const match of text.matchAll(/super\(\s*[A-Za-z_$][\w$]*\s*,\s*["']([^"']+)["']/g)) services.add(match[1]);
  for (const match of text.matchAll(/provide\(\s*["']([^"']+)["']/g)) provided.add(match[1]);
  for (const match of text.matchAll(/["'](remote\.[A-Za-z_$][\w$.]*)["']/g)) remotes.add(match[1]);
  if (needle !== "") {
    const contexts = [];
    let at = text.indexOf(needle);
    while (at !== -1 && contexts.length < 3) {
      contexts.push(text.slice(Math.max(0, at - 60), at + needle.length + 60).replace(/\s+/g, " "));
      at = text.indexOf(needle, at + needle.length);
    }
    for (const context of contexts) console.log(`  [${combo.slice(0, 24)}…] ${context}`);
  }
  if (needle === "" && text.includes("dsh-cost-balance-indicator")) {
    console.log(`  this plugin is served in: ${combo.slice(0, 40)}… (${text.length} bytes)`);
  }
}
console.log(`\nclient bytes scanned: ${bytes}`);
console.log(`\nservices constructed with super(ctx, "name"):\n  ${[...services].sort().join(", ")}`);
console.log(`\nservices provided by name:\n  ${[...provided].sort().join(", ")}`);
console.log(`\nremote namespaces referenced:\n  ${[...remotes].sort().join(", ")}`);
const settingsShaped = [...services, ...provided].filter((name) => /setting|prefer|config|scope/i.test(name)).sort();
console.log(`\nsettings-shaped services: ${settingsShaped.length > 0 ? settingsShaped.join(", ") : "(none)"}`);
