"use strict";
const fs = require("node:fs");
const path = require("node:path");
const bundledRelease = require("./scripts/agent-release.json");
const VERSION_PATTERN = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;
const INSTALLER_PATTERN = /^qa-report-agent-(\d{1,6}\.\d{1,6}\.\d{1,6})-(?:mac-arm64\.dmg|windows-x64\.exe)$/;
const RELEASE_DOWNLOAD_BASE = "https://github.com/maldenbergsergey-png/qa-report/releases/download";
function installerUrl(name) {
  const match = INSTALLER_PATTERN.exec(name);
  return match ? `${RELEASE_DOWNLOAD_BASE}/agent-v${match[1]}/${name}` : "";
}
const INSTALLERS = [
  ["mac-arm64", "macOS · Apple Silicon (M1 и новее)", "mac-arm64.dmg", "qr-report-agent-mac-arm64.dmg"],
  ["windows", "Windows · x64", "windows-x64.exe", "qr-report-agent-windows-setup.exe"],
];
function releaseServer(directory) {
  function regularFile(name) {
    try { const stat = fs.lstatSync(path.join(directory, name)); return stat.isFile() && stat.size > 0 ? stat : null; } catch { return null; }
  }
  function catalog() {
    // Only publish a catalog after verifying the assets in GitHub Releases.
    // Local installers.json from an older deployment cannot override these links.
    const version = bundledRelease.version;
    return INSTALLERS.map(([platform, label, suffix]) => {
      const name = `qa-report-agent-${version}-${suffix}`;
      const metadata = bundledRelease.files.find(file => file?.name === name);
      return { platform, label, version, url: installerUrl(name), available: Boolean(VERSION_PATTERN.test(version) && metadata) };
    });
  }
  async function handle(request, response, pathname) {
    if (!pathname.startsWith("/agent-updates/") && !/^\/downloads\/(?:qr|qa)-report-agent-/.test(pathname)) return false;
    const name = pathname.split("/").pop();
    const legacy = INSTALLERS.find(item => pathname === `/downloads/${item[3]}`);
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return true; }
    if (legacy) {
      const current = catalog().find(item => item.platform === legacy[0]);
      response.writeHead(current.available ? 307 : 404, current.available ? { Location: current.url, "Cache-Control": "no-store" } : {});
      response.end(); return true;
    }
    const installer = INSTALLER_PATTERN.test(name) && pathname === `/downloads/${name}`;
    if (installer) {
      // Redirect only supported installer names to our fixed public repository.
      // Update requests never redirect: installed agents reject redirects by design.
      response.writeHead(307, { Location: installerUrl(name), "Cache-Control": "no-store" });
      response.end(); return true;
    }
    const update = pathname === `/agent-updates/${name}` && (name === "latest.json" || /^qr-report-agent-code-\d{1,6}\.\d{1,6}\.\d{1,6}\.asar$/.test(name));
    const info = update && regularFile(name);
    if (!info) { response.writeHead(404); response.end("Not found"); return true; }
    // Only public release artifacts are reachable. Never serve paths, symlinks or keys.
    const headers = { "Content-Type": name.endsWith(".json") ? "application/json" : "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
    let start = 0, end = info.size - 1, code = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      start = range ? Number(range[1]) : -1; end = range?.[2] ? Number(range[2]) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || end >= info.size) {
        response.writeHead(416, { "Content-Range": `bytes */${info.size}` }); response.end(); return true;
      }
      code = 206; headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
    }
    headers["Content-Length"] = end - start + 1;
    response.writeHead(code, headers);
    if (request.method === "HEAD") { response.end(); return true; }
    const stream = fs.createReadStream(path.join(directory, name), { start, end });
    stream.on("error", () => response.destroy()); response.on("close", () => stream.destroy()); stream.pipe(response);
    return true;
  }
  return { catalog, handle };
}
module.exports = { releaseServer, INSTALLERS };
