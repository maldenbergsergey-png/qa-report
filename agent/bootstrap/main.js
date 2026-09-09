"use strict";
const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
// Keep explicitly selected configuration profiles isolated, including downloaded code.
if (process.env.QA_REPORT_AGENT_CONFIG_DIR) app.setPath("userData", path.join(path.resolve(process.env.QA_REPORT_AGENT_CONFIG_DIR), "desktop-profile"));
const { Updates } = require("./updates");
const policy = require("./policy.json");
// A second invocation must not mark the running release as an unsuccessful boot.
if (!app.requestSingleInstanceLock()) app.quit();
else {
const updates = new Updates({
  directory: path.join(app.getPath("userData"), "updates"),
  key: fs.readFileSync(path.join(__dirname, "release-key.pem")),
  feed: policy.feed,
  runtime: policy.runtimeVersion,
  bundledVersion: require("../package.json").version,
});
const archive = app.isPackaged ? updates.selectCode() : null;
updates.restoreStaged();
let healthy = false;
global.qaReportRuntime = {
  updates,
  hasInstanceLock: true,
  ready() { updates.markHealthy(); healthy = true; },
};
// A failed downloaded entry point rolls back on the next start. A hung first launch
// also restarts once; selectCode removes the failed candidate before loading again.
if (archive) setTimeout(() => { if (!healthy) { app.relaunch(); app.exit(1); } }, 30_000).unref();
try { require(archive ? path.join(archive, "desktop", "main.js") : "../desktop/main"); }
catch (error) {
  if (archive) { app.relaunch(); app.exit(1); }
  else throw error;
}
}
