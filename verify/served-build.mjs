// Does the RUNNING instance serve the bundle that is on disk right now?
//
// Reads the boot page, follows every combo the page lists, and reports whether
// the freshly installed client build marker is present. Prints counts and hashes
// only; never a secret.
//
//   node verify/served-build.mjs --port 19387 --marker cbi-write-chain-0.8.1
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
const marker = option("marker", "cbi-write-chain-0.8.1");
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

const page = await fetch(`http://${authority}/`, { headers: { cookie } });
const html = await page.text();
const combos = [...new Set([...html.matchAll(/(?:src|href)="(plugins\/\?\?[^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))];
let hits = 0;
let bytes = 0;
for (const combo of combos) {
  const response = await fetch(`http://${authority}/${combo}`, { headers: { cookie } });
  const text = await response.text();
  bytes += text.length;
  if (text.includes(marker)) {
    hits += 1;
    console.log(`served marker in combo ${combos.indexOf(combo) + 1}: HTTP ${response.status}, ${text.length} bytes`);
  }
}
console.log(`boot page: ${page.status}; combos: ${combos.length}; scanned: ${bytes} bytes; combos carrying "${marker}": ${hits}`);
process.exitCode = hits > 0 ? 0 : 2;
