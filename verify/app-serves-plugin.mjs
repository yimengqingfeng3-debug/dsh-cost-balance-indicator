// Does a RUNNING DSH instance actually serve this plugin's browser half?
//
// The desktop app answers single-module `/plugins/??<module>/client.js` requests
// with 404: it serves its modules as ONE combo URL per boot page section, so the
// only honest probe is "read the boot page, follow the combo that lists our
// client.js, and check that response".
//
//   node verify/app-serves-plugin.mjs --port 19387
//
// Exits 0 and prints `served: 200 <bytes>` when the bundle is there, prints
// `served: absent` and exits 1 when the boot page does not list it at all.
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
const module = option("module", "dsh-cost-balance-indicator");
const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
const base64url = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

function readSessionSecret() {
  const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
  const block = /client-connection\/browser-session:([\s\S]*?)(?:\n\S|$)/.exec(text);
  if (block === null) throw new Error("no client-connection/browser-session record");
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
if (!page.ok) {
  console.log(`boot page: HTTP ${page.status}`);
  process.exitCode = 1;
} else {
  const html = await page.text();
  const combos = [...new Set([...html.matchAll(/(?:src|href)="(plugins\/\?\?[^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))];
  const combo = combos.find((value) => value.includes(`${module}/client.js`));
  if (combo === void 0) {
    console.log(`served: absent (the boot page lists ${combos.length} combos, none with ${module})`);
    process.exitCode = 1;
  } else {
    const response = await get(`/${combo}`);
    const text = await response.text();
    console.log(`served: ${response.status} ${text.length} bytes (combo ${combos.indexOf(combo) + 1} of ${combos.length})`);
    if (!response.ok) process.exitCode = 1;
  }
}
