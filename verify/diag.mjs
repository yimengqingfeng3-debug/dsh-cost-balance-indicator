// Read the browser half's own report from a running DSH instance.
//
// A shell whose renderer cannot be inspected from outside (the desktop app) gives
// a plugin no way to say why it rendered nothing. The plugin therefore POSTs a
// small report (activation flags, registered slot ids, DOM counts, guard warnings)
// to `/api/cost-balance-indicator.diag`, and this tool reads it back with the same
// signed cookie the GUI uses.
//
//   node verify/diag.mjs --port 19387
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

const response = await fetch(`http://${authority}/api/cost-balance-indicator.diag`, { headers: { cookie } });
console.log(`GET /api/cost-balance-indicator.diag -> ${response.status}`);
const payload = await response.json().catch(() => null);
if (payload === null) {
  console.log("the host did not answer JSON (the route may predate this build)");
  process.exitCode = 1;
} else if (payload.report === null || payload.report === void 0) {
  console.log("no report yet: the browser half has not run this build (reload the window so it loads the new module)");
} else {
  console.log(JSON.stringify(payload.report, null, 2));
}
