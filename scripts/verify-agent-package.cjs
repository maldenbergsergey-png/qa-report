"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const asar = require("../agent/node_modules/@electron/asar");
const root = path.resolve(__dirname, "../agent");
const pkg = require("../agent/package.json");
const targets = {
  mac: ["mac", "mac-arm64"].map(dir => `${dir}/QA Report Agent.app/Contents/Resources/app.asar`),
  win: ["win-unpacked", "win-arm64-unpacked"].map(dir => `${dir}/resources/app.asar`),
  linux: ["linux-unpacked", "linux-arm64-unpacked"].map(dir => `${dir}/resources/app.asar`),
};
assert(targets[process.argv[2]], "Specify mac, win or linux");
for (const relative of targets[process.argv[2]]) {
  const archive = path.join(root, "dist", relative);
  const bundled = JSON.parse(asar.extractFile(archive, "package.json").toString());
  assert.equal(bundled.version, pkg.version, `Wrong GUI version in ${relative}`);
  for (const name of ["qa-report-agent.js", "desktop/main.js", "desktop/network.js"]) {
    assert.deepEqual(asar.extractFile(archive, name), fs.readFileSync(path.join(root, name)), `Stale ${name} in ${relative}`);
  }
  assert.match(asar.extractFile(archive, "qa-report-agent.js").toString(), /attachmentDownload: true/);
  assert.match(asar.extractFile(archive, "qa-report-agent.js").toString(), /jira\.attachment-manifest/);
  console.log(`PASS: ${relative}, GUI ${pkg.version}, current attachment import core`);
}
