"use strict";
const { spawnSync } = require("node:child_process");
const env = { ...process.env };
// GitHub supplies missing secrets as empty strings. electron-builder treats
// an empty certificate path as the current directory instead of 'not set'.
for (const name of ["CSC_LINK", "CSC_KEY_PASSWORD", "WIN_CSC_LINK", "WIN_CSC_KEY_PASSWORD", "APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"]) {
  if (env[name] === "") delete env[name];
}
const result = spawnSync(process.execPath, [require.resolve("electron-builder/cli.js"), ...process.argv.slice(2)], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
