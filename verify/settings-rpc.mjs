// Talk to a RUNNING DSH instance's `remote.settings` over its HTTP RPC channel,
// so the host's own answers can be read without a browser.
//
//   node verify/settings-rpc.mjs --port 19387 describe
//   node verify/settings-rpc.mjs --port 19387 mutate  <ns> <field> <jsonValue>
//   node verify/settings-rpc.mjs --port 19387 update  <ns> <field> <jsonValue>
//   node verify/settings-rpc.mjs --port 19387 replace <ns> <field> <jsonValue>
//
// The wire form is the Connection RPC envelope on the shared `/api` channel:
// POST /api/<endpoint> with { type: "client-request", rpcId, method, payload },
// where `payload` is `{ args: { <Host parameter name>: … } }`. It mints the same
// signed cookie the GUI uses and prints the host's RAW reply (code + message
// included). Identifiers only, never a secret.
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
const [action, ns, field, rawValue] = bare;
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

/** One unary RPC round trip: returns the envelope's result, verbatim. */
async function call(endpoint, parameters) {
  const response = await fetch(`http://${authority}/api/${endpoint}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method: endpoint, payload: { args: parameters } })
  });
  const text = await response.text();
  try {
    const envelope = JSON.parse(text);
    return { http: response.status, result: envelope?.result };
  } catch {
    return { http: response.status, raw: text.slice(0, 300) };
  }
}

/** Compact view of one namespace descriptor: keys and small scalars only. */
function summarize(value) {
  if (value === null || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "schema") {
      out.schemaKeys = entry !== null && typeof entry === "object" ? Object.keys(entry).slice(0, 12) : typeof entry;
      continue;
    }
    if (key === "value" || key === "base" || key === "user") {
      out[key] = { keys: entry !== null && typeof entry === "object" ? Object.keys(entry) : null };
      continue;
    }
    out[key] = entry;
  }
  return out;
}

const target = ns ?? "cost-balance-indicator";

if (action === "describe") {
  const reply = await call("settings/describe", {});
  if (reply.result?.ok !== true) {
    console.log(JSON.stringify({ endpoint: "settings/describe", http: reply.http, result: reply.result, raw: reply.raw }, null, 2));
  } else {
    const value = reply.result.value ?? {};
    const namespaces = Array.isArray(value.namespaces) ? value.namespaces : [];
    console.log(JSON.stringify({ endpoint: "settings/describe", http: reply.http, writable: value.writable, hasDocument: value.hasDocument, namespaceCount: namespaces.length }, null, 2));
    console.log("ALL NAMESPACE IDS: " + JSON.stringify(namespaces.map((row) => row?.ns)));
    for (const entry of namespaces) {
      if (entry?.ns !== target) continue;
      console.log("OUR NAMESPACE: " + JSON.stringify(summarize(entry), null, 2));
    }
  }
} else if (action === "mutate" || action === "update" || action === "replace") {
  // A value given as `str:<text>` is a plain string; anything else is JSON.
  // This keeps a Windows shell's quote handling out of the tool's way.
  const value = rawValue === void 0 ? "" : rawValue.startsWith("str:") ? rawValue.slice(4) : JSON.parse(rawValue);
  const described = await call("settings/describe", {});
  const entry = (Array.isArray(described.result?.value?.namespaces) ? described.result.value.namespaces : []).find((row) => row?.ns === target);
  const revision = entry?.revision;
  const parameters = action === "mutate"
    ? { ns: target, ops: [{ op: "set", path: [field], value }], expectedRevision: revision }
    : action === "update"
      ? { ns: target, patch: { [field]: value }, expectedRevision: revision }
      : { ns: target, section: { ...(entry?.value ?? {}), [field]: value }, expectedRevision: revision };
  const reply = await call(`settings/${action}`, parameters);
  const report = {
    endpoint: `settings/${action}`,
    http: reply.http,
    sent: action === "replace" ? { ns: target, sectionKeys: Object.keys(parameters.section), expectedRevision: revision } : parameters,
    expectedRevisionFromDescribe: revision,
    result: reply.result ?? reply.raw
  };
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("usage: node verify/settings-rpc.mjs --port 19387 describe|mutate|update|replace [ns] [field] [jsonValue]");
  process.exitCode = 2;
}
