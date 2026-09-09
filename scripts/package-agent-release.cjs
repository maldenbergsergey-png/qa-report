"use strict";
// Repository transport only. Reassembled files retain their original SHA-256/signatures.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const CHUNK_SIZE = 48 * 1024 * 1024;
const PUBLIC_FILE = /^(?:qa-report-agent-\d+\.\d+\.\d+-(?:mac-arm64\.dmg|windows-x64\.exe)|qr-report-agent-code-\d+\.\d+\.\d+\.asar|installers\.json|latest\.json)$/;
function digest(data) { return crypto.createHash("sha256").update(data).digest("hex"); }
function regularFile(file) {
  if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular file: ${path.basename(file)}`);
}
function pack(source, target) {
  const installers = JSON.parse(fs.readFileSync(path.join(source, "installers.json"), "utf8"));
  const names = [...installers.files.map(file => file.name), `qr-report-agent-code-${installers.version}.asar`, "installers.json", "latest.json"];
  if (fs.existsSync(target)) throw new Error("Bundle destination must be new");
  fs.mkdirSync(target, { recursive: true });
  const files = [];
  for (const name of names) {
    if (!PUBLIC_FILE.test(name)) throw new Error(`Not a public release artifact: ${name}`);
    const sourceFile = path.join(source, name); regularFile(sourceFile);
    const fd = fs.openSync(sourceFile, "r");
    const hash = crypto.createHash("sha256"), parts = [];
    let size = 0;
    try {
      const buffer = Buffer.alloc(CHUNK_SIZE);
      let bytes;
      while ((bytes = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
        const data = buffer.subarray(0, bytes);
        const partName = `${name}.part-${String(parts.length + 1).padStart(3, "0")}`;
        fs.writeFileSync(path.join(target, partName), data, { flag: "wx" });
        hash.update(data); size += bytes;
        parts.push({ name: partName, size: bytes, sha256: digest(data) });
      }
    } finally { fs.closeSync(fd); }
    const sha256 = hash.digest("hex"), expected = installers.files.find(file => file.name === name);
    if (expected && (expected.size !== size || expected.sha256 !== sha256)) throw new Error(`Installer checksum mismatch: ${name}`);
    files.push({ name, size, sha256, parts });
  }
  fs.writeFileSync(path.join(target, "bundle.json"), JSON.stringify({ version: installers.version, files }, null, 2) + "\n");
}
function assemble(source, target) {
  const manifest = JSON.parse(fs.readFileSync(path.join(source, "bundle.json"), "utf8"));
  fs.mkdirSync(target, { recursive: true });
  for (const artifact of manifest.files) {
    if (!PUBLIC_FILE.test(artifact.name) || !Array.isArray(artifact.parts) || !artifact.parts.length) throw new Error("Invalid release artifact");
    const destination = path.join(target, artifact.name);
    const temporary = `${destination}.${crypto.randomUUID()}.part`;
    const fd = fs.openSync(temporary, "wx", 0o644);
    const hash = crypto.createHash("sha256"); let size = 0;
    try {
      for (const [index, part] of artifact.parts.entries()) {
        if (part.name !== `${artifact.name}.part-${String(index + 1).padStart(3, "0")}` || !Number.isSafeInteger(part.size) || part.size <= 0 || part.size > CHUNK_SIZE) throw new Error("Invalid release part");
        const file = path.join(source, part.name); regularFile(file);
        if (fs.statSync(file).size !== part.size) throw new Error(`Part size mismatch: ${part.name}`);
        const data = fs.readFileSync(file);
        if (digest(data) !== part.sha256) throw new Error(`Part checksum mismatch: ${part.name}`);
        fs.writeFileSync(fd, data); hash.update(data); size += data.length;
      }
      if (size !== artifact.size || hash.digest("hex") !== artifact.sha256) throw new Error(`Artifact checksum mismatch: ${artifact.name}`);
      fs.closeSync(fd);
      fs.renameSync(temporary, destination);
      console.log(`Verified: ${artifact.name} (${size} bytes)`);
    } catch (error) {
      try { fs.closeSync(fd); } catch { /* Already closed before rename. */ }
      fs.rmSync(temporary, { force: true }); throw error;
    }
  }
}
if (require.main === module) {
  const [command, source, target] = process.argv.slice(2);
  try {
    if (!source || !target || !["pack", "assemble"].includes(command)) throw new Error("Usage: node scripts/package-agent-release.cjs <pack|assemble> <source> <target>");
    (command === "pack" ? pack : assemble)(path.resolve(source), path.resolve(target));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { pack, assemble };
