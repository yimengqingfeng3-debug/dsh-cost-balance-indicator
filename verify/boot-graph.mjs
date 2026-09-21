// Boot-graph probe: which client plugin modules a running DSH instance composes
// into the page it serves. Useful to prove that a row you disabled really left
// the graph, and that a row you mounted really joined it.
//
//   node verify/boot-graph.mjs --port 3080 dsh-peak-indicator dsh-cost-balance-indicator
//
// It mints the same signed browser cookie as the GUI (HMAC over the
// `client-connection/browser-session` credential) and never prints secrets.
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
const ids = args.filter((value, index) => !value.startsWith("--") && args[index - 1] !== "--host" && args[index - 1] !== "--port");
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
const response = await fetch(`http://${authority}/`, { headers: { cookie } });
const html = await response.text();
console.log(`GET / -> ${response.status}, ${html.length} bytes`);
// The boot graph is one JSON blob; list every client module id it mentions.
const moduleIds = [...new Set([...html.matchAll(/"(?:id|name)":"((?:@[^"]*|[a-z0-9-]*dsh[a-z0-9-]*)\/client[^"]*)"/g)].map((match) => match[1]))];
if (moduleIds.length > 0) console.log("client modules in the graph:", moduleIds.join(", "));
const wanted = ids.length > 0 ? ids : ["dsh-peak-indicator", "dsh-balance-indicator", "dsh-cost-balance-indicator"];
for (const id of wanted) console.log(`${html.includes(id) ? "present" : "absent "}  ${id}`);
