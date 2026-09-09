"use strict";
const fs = require("node:fs");
const path = require("node:path");
const INSTALLERS = [
  ["mac-arm64", "macOS · Apple Silicon (M1 и новее)", "qr-report-agent-mac-arm64.dmg"],
  ["windows", "Windows · x64", "qr-report-agent-windows-setup.exe"],
];
function releaseServer(directory) {
  function regularFile(name) {
    try { const stat = fs.lstatSync(path.join(directory, name)); return stat.isFile() && stat.size > 0 ? stat : null; } catch { return null; }
  }
  function catalog() {
    let version = "";
    try { version = JSON.parse(fs.readFileSync(path.join(directory, "installers.json"), "utf8")).version; } catch { /* Artifacts can be uploaded separately. */ }
    return INSTALLERS.map(([platform, label, name]) => ({ platform, label, version, url: `/downloads/${name}`, available: Boolean(regularFile(name)) }));
  }
  async function handle(request, response, pathname) {
    if (!pathname.startsWith("/agent-updates/") && !/^\/downloads\/(?:qr-report-agent-|qa-report-agent-linux)/.test(pathname)) return false;
    const name = pathname.split("/").pop();
    const installer = INSTALLERS.some(item => item[2] === name) && pathname === `/downloads/${name}`;
    const update = pathname === `/agent-updates/${name}` && (name === "latest.json" || /^qr-report-agent-code-\d{1,6}\.\d{1,6}\.\d{1,6}\.asar$/.test(name));
    const info = (installer || update) && regularFile(name);
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return true; }
    if (!info) { response.writeHead(404); response.end("Not found"); return true; }
    // Only public release artifacts are reachable. Never serve paths, symlinks or keys.
    const headers = { "Content-Type": name.endsWith(".json") ? "application/json" : "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
    if (installer) headers["Content-Disposition"] = `attachment; filename="${name}"`;
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
