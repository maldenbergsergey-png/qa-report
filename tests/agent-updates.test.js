"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { Updates, verifyManifest, compare } = require("../agent/bootstrap/updates");
const pair = crypto.generateKeyPairSync("ed25519");
function release(version = "0.4.1", overrides = {}, bytes = Buffer.from("verified code")) {
  const data = { version, runtime: "0.4.0", minimumVersion: "0.4.0", file: `qr-report-agent-code-${version}.asar`, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), notes: ["Обновление"], ...overrides };
  const payload = Buffer.from(JSON.stringify(data));
  return { envelope: { schema: 1, payload: payload.toString("base64"), signature: crypto.sign(null, payload, pair.privateKey).toString("base64") }, data, bytes };
}
function fixture(t, artifact = release()) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-update-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const options = { directory, key: pair.publicKey, runtime: "0.4.0", feed: "https://updates.example.test/agent-updates/", request: async (url, init) => {
    calls.push({ url, init });
    return new Response(url.endsWith("latest.json") ? JSON.stringify(artifact.envelope) : artifact.bytes);
  } };
  return { directory, calls, options, updater: new Updates(options) };
}
test("a signed update downloads, activates, verifies offline and commits only after a healthy boot", async t => {
  const { updater, options, calls } = fixture(t);
  await updater.check({ download: true });
  assert.equal(updater.state.phase, "ready");
  assert.equal(calls.length, 2);
  for (const { init } of calls) { assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit"); assert.equal(init.headers, undefined); }
  updater.activate();
  const next = new Updates(options);
  assert.match(next.selectCode(), /code-0.4.1.asar$/);
  assert.equal(next.version, "0.4.1");
  next.markHealthy();
  assert.match(new Updates(options).selectCode(), /code-0.4.1.asar$/);
});
test("an unsuccessful first launch rolls back and will not repeatedly install the failed release", async t => {
  const { updater, options } = fixture(t);
  await updater.check({ download: true }); updater.activate();
  new Updates(options).selectCode(); // Simulates termination before ready().
  const rollback = new Updates(options);
  assert.equal(rollback.selectCode(), null);
  await rollback.check({ download: true });
  assert.equal(rollback.state.phase, "error");
  assert.match(rollback.state.message, /не удалось запустить/);
});
test("tampered archives never execute and a preceding working update is retained", async t => {
  const { updater, options, directory } = fixture(t);
  await updater.check({ download: true }); updater.activate();
  const running = new Updates(options); running.selectCode(); running.markHealthy();
  const second = release("0.4.2");
  running.request = async url => new Response(url.endsWith("latest.json") ? JSON.stringify(second.envelope) : second.bytes);
  await running.check({ download: true }); running.activate();
  fs.writeFileSync(path.join(directory, second.data.file), "tampered");
  const restored = new Updates(options);
  assert.match(restored.selectCode(), /code-0.4.1.asar$/);
});
test("signature, paths, hashes, sizes, schema and version bounds are validated", () => {
  const valid = release();
  assert.equal(verifyManifest(valid.envelope, pair.publicKey).version, "0.4.1");
  assert.throws(() => verifyManifest({ ...valid.envelope, payload: Buffer.from("{}").toString("base64") }, pair.publicKey), /Подпись/);
  assert.throws(() => verifyManifest(valid.envelope, crypto.generateKeyPairSync("ed25519").publicKey), /Подпись/);
  for (const overrides of [{ file: "../main.js" }, { file: "https://evil.example/app.asar" }, { size: 0 }, { size: 9e6 }, { size: 1.5 }, { sha256: "invalid" }, { version: "1.0.0-beta" }, { runtime: "bad" }, { minimumVersion: "2.0.0" }, { notes: ["x".repeat(301)] }]) {
    assert.throws(() => verifyManifest(release("0.4.1", overrides).envelope, pair.publicKey));
  }
  assert.equal(compare("0.4.10", "0.4.9"), 1);
});
test("corrupted bytes, oversized responses and unsigned manifests cannot stage code", async t => {
  const { updater } = fixture(t);
  updater.request = async url => new Response(url.endsWith("latest.json") ? JSON.stringify(release().envelope) : "invalid");
  await updater.check({ download: true }); assert.equal(updater.state.phase, "error"); assert.equal(updater.saved.staged, undefined);
  updater.request = async () => new Response("x", { headers: { "content-length": "1000000" } });
  await updater.check(); assert.equal(updater.state.phase, "error");
  updater.request = async () => new Response(JSON.stringify({ schema: 1, payload: "e30=", signature: "wrong" }));
  await updater.check(); assert.equal(updater.state.phase, "error");
});
test("manual checks bypass no interval but concurrent checks share a single request", async t => {
  const { updater, calls } = fixture(t, release("0.4.0"));
  await Promise.all([updater.check(), updater.check(), updater.check()]);
  assert.equal(calls.length, 1); assert.equal(updater.state.phase, "current");
  await updater.check(); assert.equal(calls.length, 2);
  assert.equal(updater.saved.staged, undefined);
});
test("new runtimes require an installer and signed minimum versions show a required update", async t => {
  const { updater, calls } = fixture(t, release("0.5.0", { runtime: "0.5.0", minimumVersion: "0.5.0" }));
  await updater.check({ download: true });
  assert.equal(updater.state.phase, "installer"); assert.equal(updater.state.required, true); assert.equal(calls.length, 1);
  assert.throws(() => new Updates({ runtime: "0.4.0", feed: "http://updates.example.test/" }), /HTTPS/);
});
test("a newer full installer supersedes an older downloaded patch", async t => {
  const { updater, options } = fixture(t);
  await updater.check({ download: true }); updater.activate();
  const installed = new Updates({ ...options, bundledVersion: "0.4.2" });
  assert.equal(installed.selectCode(), null); assert.equal(installed.version, "0.4.2");
});

test("downloaded updates remain installable offline after restarting the agent", async t => {
  const { updater, options } = fixture(t);
  await updater.check({ download: true });
  const restarted = new Updates({ ...options, request: async () => { throw new Error("Offline"); } });
  assert.equal(restarted.restoreStaged(), true);
  await restarted.check();
  assert.equal(restarted.state.phase, "ready");
  restarted.activate();
  assert.match(new Updates(options).selectCode(), /code-0.4.1.asar$/);
});

test("a corrupt saved catalog cannot block a subsequent valid signed release", async t => {
  const { updater, options, directory } = fixture(t);
  fs.writeFileSync(path.join(directory, "state.json"), JSON.stringify({ active: { schema: 1, payload: "e30=", signature: "invalid" } }));
  const restored = new Updates(options);
  assert.equal(restored.selectCode(), null);
  await restored.check({ download: true }); assert.equal(restored.state.phase, "ready");
  fs.writeFileSync(path.join(directory, "state.json"), "null");
  assert.equal(new Updates(options).selectCode(), null);
});
