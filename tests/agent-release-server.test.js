"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), http = require("node:http"), crypto = require("node:crypto");
const { releaseServer } = require("../agent-release-server");
const { verifyManifest } = require("../agent/bootstrap/updates");
const installers = require("../scripts/agent-release.json");
async function serve(t, dir) {
  const service = releaseServer(dir);
  const server = http.createServer(async (req, res) => {
    if (!await service.handle(req, res, new URL(req.url, "http://localhost").pathname)) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { service, base: `http://127.0.0.1:${server.address().port}` };
}
test("installer links use public GitHub assets without storing or proxying binaries on the site", async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-release-server-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { service, base } = await serve(t, dir);
  const catalog = service.catalog();
  assert.equal(catalog.length, 2); assert.deepEqual(catalog.map(item => item.platform), ["mac-arm64", "windows"]);
  for (const [index, file] of installers.files.entries()) {
    const item = catalog[index]; assert.equal(item.available, true);
    assert.equal(item.version, installers.version); assert.equal(item.url, `${installers.baseUrl}/${file.name}`);
    for (const method of ["GET", "HEAD"]) {
      const result = await fetch(`${base}/downloads/${file.name}`, { method, redirect: "manual" });
      assert.equal(result.status, 307); assert.equal(result.headers.get("location"), item.url); assert.equal(await result.text(), "");
    }
  }
  for (const [old, index] of [["qr-report-agent-mac-arm64.dmg", 0], ["qr-report-agent-windows-setup.exe", 1]]) {
    const alias = await fetch(`${base}/downloads/${old}`, { redirect: "manual" });
    assert.equal(alias.status, 307); assert.equal(alias.headers.get("location"), catalog[index].url);
  }
  fs.writeFileSync(path.join(dir, "installers.json"), JSON.stringify({ version: "0.3.0", files: [{ name: "installer", sourceUrl: "https://untrusted.example" }] }));
  assert.deepEqual(service.catalog(), catalog, "stale server metadata cannot override verified GitHub links");
  const name = "qa-report-agent-0.4.0-mac-arm64.dmg";
  assert.equal((await fetch(`${base}/downloads/${name}`, { method: "POST", redirect: "manual" })).status, 405);
  for (const url of ["/downloads/qa-report-agent-0.4.0-linux-x64.deb", "/downloads/qr-report-agent-mac-x64.dmg", "/downloads/qa-report-agent-0.4.0-windows-arm64.exe", "/downloads/qa-report-agent-0.4.0-mac-arm64.dmg/evil", "/downloads/https://evil.example/app.exe"]) assert.equal((await fetch(base + url, { redirect: "manual" })).status, 404);
});
test("the installed agent still receives the original signed code update directly, including ranges", async t => {
  const directory = path.join(__dirname, "..", "agent-update-feed");
  const { base } = await serve(t, directory);
  const result = await fetch(`${base}/agent-updates/latest.json`, { redirect: "error" });
  assert.equal(result.status, 200); assert.equal(result.headers.get("cache-control"), "no-store");
  const release = verifyManifest(await result.json(), fs.readFileSync(path.join(__dirname, "../agent/bootstrap/release-key.pem")));
  const bytes = Buffer.from(await (await fetch(`${base}/agent-updates/${release.file}`, { redirect: "error" })).arrayBuffer());
  assert.equal(bytes.length, release.size); assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), release.sha256);
  const partial = await fetch(`${base}/agent-updates/${release.file}`, { headers: { Range: "bytes=2-5" } });
  assert.equal(partial.status, 206); assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(2, 6));
  const head = await fetch(`${base}/agent-updates/${release.file}`, { method: "HEAD" });
  assert.equal(head.headers.get("content-length"), String(release.size)); assert.equal(await head.text(), "");
  assert.equal((await fetch(`${base}/agent-updates/${release.file}`, { headers: { Range: `bytes=${release.size}-` } })).status, 416);
  for (const url of ["/agent-updates/private.pem", "/agent-updates/%2e%2e/private.pem", "/agent-updates/qa-report-agent-0.4.0-mac-arm64.dmg"]) assert.equal((await fetch(base + url)).status, 404);
});
test("signed update paths never serve symlinks", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qa-release-symlink-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, "private.pem"), "secret");
  fs.symlinkSync(path.join(directory, "private.pem"), path.join(directory, "qr-report-agent-code-0.4.1.asar"));
  const { base } = await serve(t, directory);
  assert.equal((await fetch(`${base}/agent-updates/qr-report-agent-code-0.4.1.asar`)).status, 404);
});
