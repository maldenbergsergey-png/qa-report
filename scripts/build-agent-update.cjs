"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const asar = require("../agent/node_modules/@electron/asar");
const { verifyManifest, compare } = require("../agent/bootstrap/updates");
const agent = path.resolve(__dirname, "../agent");
const pkg = require("../agent/package.json");
const policy = require("../agent/bootstrap/policy.json");
const FILES = ["qa-report-agent.js", "jira-profiles.js", "desktop/main.js", "desktop/network.js", "desktop/connection.js", "desktop/preload.js", "desktop/renderer.js", "desktop/index.html", "desktop/styles.css", "desktop/tray.png"];
async function build({ keyFile, directory, minimumVersion = policy.runtimeVersion, notes = ["Несколько подключений Jira и обновления из окна агента."] }) {
  if (!keyFile) throw new Error("Укажите AGENT_SIGNING_KEY_FILE: закрытый ключ выпуска хранится вне репозитория");
  const key = crypto.createPrivateKey(fs.readFileSync(keyFile));
  const publicKey = fs.readFileSync(path.join(agent, "bootstrap/release-key.pem"));
  const signatureProbe = crypto.sign(null, Buffer.from("release-key-check"), key);
  if (!crypto.verify(null, Buffer.from("release-key-check"), publicKey, signatureProbe)) throw new Error("Ключ не соответствует установленным агентам");
  compare(pkg.version, minimumVersion);
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "qa-agent-release-"));
  fs.mkdirSync(directory, { recursive: true });
  const name = `qr-report-agent-code-${pkg.version}.asar`;
  const archive = path.join(directory, name);
  try {
    for (const name of FILES) {
      const target = path.join(stage, name); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(agent, name), target);
    }
    fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ name: pkg.name, version: pkg.version, main: "desktop/main.js" }));
    await asar.createPackage(stage, archive);
    // Check exactly which code is delivered; no bootstrap or developer dependency can enter a patch.
    const bundled = asar.listPackage(archive).filter(name => !asar.statFile(archive, name.replace(/^\//, "")).files).map(name => name.replace(/^\//, ""));
    if (bundled.sort().join("\n") !== [...FILES, "package.json"].sort().join("\n")) throw new Error("В пакет попали неожиданные файлы");
    for (const name of FILES) if (!asar.extractFile(archive, name).equals(fs.readFileSync(path.join(agent, name)))) throw new Error(`Неактуальный файл: ${name}`);
    const bytes = fs.readFileSync(archive);
    const payload = Buffer.from(JSON.stringify({ version: pkg.version, runtime: policy.runtimeVersion, minimumVersion, file: name,
      size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), publishedAt: new Date().toISOString(), notes }));
    const envelope = { schema: 1, payload: payload.toString("base64"), signature: crypto.sign(null, payload, key).toString("base64") };
    verifyManifest(envelope, publicKey);
    const temporary = path.join(directory, "latest.json.tmp");
    fs.writeFileSync(temporary, JSON.stringify(envelope, null, 2) + "\n");
    fs.renameSync(temporary, path.join(directory, "latest.json"));
    return { version: pkg.version, archive, size: bytes.length };
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
if (require.main === module) build({ keyFile: process.env.AGENT_SIGNING_KEY_FILE, directory: path.resolve(process.argv[2] || "agent-releases"), minimumVersion: process.env.AGENT_MINIMUM_VERSION, notes: process.env.AGENT_RELEASE_NOTES ? JSON.parse(process.env.AGENT_RELEASE_NOTES) : undefined })
  .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { build, FILES };
