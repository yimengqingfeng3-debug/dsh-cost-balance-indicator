// What does a REAL volatile-declaring namespace look like over the wire?
//
//   node verify/schema-wire.mjs --port 19387 <ns>
//
// Prints the host's serialized schema for one namespace, so the exact shape a
// plugin must produce to be editable live is read from the running core rather
// than guessed. Identifiers only, never a secret.
import { createHash, createHmac, randomUUID } from "node:crypto";
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
const bare = [];
for (let index = 0; index < args.length; index++) {
  if (args[index].startsWith("--")) { index += 1; continue; }
  bare.push(args[index]);
}
const wanted = bare[0];
const base64url = (value) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");

const text = readFileSync(join(home, ".credentials.yaml"), "utf8");
const block = /client-connection\/browser-session:([\s\S]*?)(?:\n\S|$)/.exec(text);
const secret = Buffer.from(/secret:\s*['"]?([A-Za-z0-9_-]+)['"]?/.exec(block[1])[1].replaceAll("-", "+").replaceAll("_", "/"), "base64");
const authority = `${host}:${port}`;
const cookieName = "dsh-auth-" + base64url(createHash("sha256").update(authority).digest());
const issuedAt = Date.now();
const body = base64url(Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt: issuedAt + 86400000 }), "utf8"));
const cookie = `${cookieName}=v1.${body}.${base64url(createHmac("sha256", secret).update(body).digest())}`;

const response = await fetch(`http://${authority}/api/settings/describe`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method: "settings/describe", payload: { args: {} } })
});
const envelope = await response.json();
const namespaces = envelope?.result?.value?.namespaces ?? [];
for (const entry of namespaces) {
  if (entry?.ns !== wanted) continue;
  console.log(`ns=${entry.ns} applies=${entry.applies} revision=${entry.revision}`);
  console.log(`valueKeys=${JSON.stringify(Object.keys(entry.value ?? {}))}`);
  const json = JSON.stringify(entry.schema);
  console.log(`schema bytes=${json.length}`);
  // Where does the wire schema advertise volatility? Print every path that
  // carries an `x-cordis` or `meta.volatile` marker, plus the top-level keys.
  console.log(`top-level schema keys=${JSON.stringify(Object.keys(entry.schema ?? {}))}`);
  const hits = [];
  const visit = (node, path) => {
    if (node === null || typeof node !== "object") return;
    if (node["x-cordis"] !== void 0) hits.push(`${path.join(".")} -> x-cordis=${JSON.stringify(node["x-cordis"])}`);
    if (node.meta?.volatile !== void 0) hits.push(`${path.join(".")} -> meta.volatile=${JSON.stringify(node.meta.volatile)}`);
    if (node.meta !== void 0 && Object.keys(node.meta).length > 0 && node.meta.volatile === void 0 && node.meta.role === void 0) hits.push(`${path.join(".")} -> meta=${JSON.stringify(node.meta)}`);
    for (const [key, child] of Object.entries(node.dict ?? {})) visit(child, [...path, key]);
    if (node.inner !== void 0) visit(node.inner, [...path, "$inner"]);
  };
  visit(entry.schema, []);
  for (const hit of hits.slice(0, 25)) console.log("  " + hit);
  if (hits.length > 25) console.log(`  … ${hits.length - 25} more`);
}
