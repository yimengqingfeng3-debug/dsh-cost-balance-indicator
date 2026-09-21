// Live verification for dsh-cost-balance-indicator.
//
// The Host's `/api` channel refuses unauthenticated requests with 401 before
// route dispatch, so a plain curl cannot tell a mounted route from a missing
// one. This script mints the same signed browser cookie the GUI holds — HMAC
// over the `client-connection/browser-session` secret in the credential store —
// and checks, for a running DSH instance:
//
//   1. a known route as a control,
//   2. the balance route owned by this plugin,
//   3. that the boot graph served to the browser composes this plugin,
//   4. that the plugin's browsed bundle is served and carries every surface.
//
// It never prints the browser-session secret, the DeepSeek API key, or the
// launch token.
//
//   node verify/check-cost-balance.mjs [--host 127.0.0.1] [--port 3080]
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
const port = option("port", "3080");
const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");

/** Same encoding as the Host's cookie codec. */
const base64url = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

/** Read the browser-session signing secret out of the managed credential store. */
function readSessionSecret() {
  const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
  const block = /client-connection\/browser-session:([\s\S]*?)(?:\n\S|$)/.exec(text);
  if (block === null) throw new Error("no client-connection/browser-session record in the credential store");
  const secret = /secret:\s*['"]?([A-Za-z0-9_-]+)['"]?/.exec(block[1]);
  if (secret === null) throw new Error("the browser-session record carries no secret");
  return Buffer.from(secret[1].replaceAll("-", "+").replaceAll("_", "/"), "base64");
}

/** Mint a browser cookie valid for this authority, exactly as authorizeIndex does. */
function mintCookie(authority, secret) {
  const name = "dsh-auth-" + base64url(createHash("sha256").update(authority).digest());
  const issuedAt = Date.now();
  const payload = { version: 1, authority, issuedAt, expiresAt: issuedAt + 24 * 60 * 60 * 1000 };
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = base64url(createHmac("sha256", secret).update(body).digest());
  return `${name}=v1.${body}.${signature}`;
}

const authority = `${host}:${port}`;
const cookie = mintCookie(authority, readSessionSecret());
const pluginId = "dsh-cost-balance-indicator";

for (const [label, path] of [["control", "/api/present.host"], ["balance", "/api/deepseek.balance"]]) {
  const response = await fetch(`http://${authority}${path}`, { headers: { cookie, accept: "application/json" } });
  const text = await response.text();
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    pretty = text.trim().slice(0, 200);
  }
  console.log(`--- ${label}: GET ${path} -> ${response.status}`);
  console.log(pretty);
  if (label === "balance" && response.status !== 200) process.exitCode = 1;
}

// The browser half is served only if the plugin row is part of the composed
// boot graph, so read the index document the GUI itself receives.
const index = await fetch(`http://${authority}/`, { headers: { cookie } });
const html = await index.text();
const present = html.includes(pluginId);
console.log(`--- client module: GET / -> ${index.status}, boot graph mentions ${pluginId}: ${present}`);
if (!present) {
  console.log("the browser half is not composed; reload after the patch layer settles");
  process.exitCode = 1;
} else {
  const urls = [...html.matchAll(/["'](\/plugins\/[^"']*cost-balance-indicator[^"']*)["']/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  for (const url of urls) {
    const bundle = await fetch(`http://${authority}${url}`);
    const body = await bundle.text();
    const surfaces = ["PeriodBadge", "HeaderSpend", "TurnCost", "BalanceChip", "CompactSettingsRow", "PillColorPanel"].filter((name) => body.includes(name));
    console.log(`--- bundle: GET ${url.slice(0, 80)}${url.length > 80 ? "..." : ""} -> ${bundle.status}, ${body.length} bytes, surfaces: ${surfaces.join(", ") || "none"}`);
    if (bundle.status !== 200 || surfaces.length !== 6) process.exitCode = 1;
  }
  if (urls.length === 0) console.log("no /plugins URL pairing this module with its combo was found in the document");
}
