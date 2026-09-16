"use strict";
const crypto = require("node:crypto");
const manifest = require("./agent-release.json");

// Deliberately anonymous: a maintainer's GitHub session can hide a private-release 404.
async function checkDownloads() {
  for (const artifact of manifest.files) {
    const response = await fetch(`${manifest.baseUrl}/${artifact.name}`, { signal: AbortSignal.timeout(300_000) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`${artifact.name}: HTTP ${response.status}. Проверьте публичность репозитория, релиза и имя файла.`);
    }
    const hash = crypto.createHash("sha256");
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > artifact.size) throw new Error(`${artifact.name}: размер превышает каталог`);
      hash.update(chunk);
    }
    if (size !== artifact.size || hash.digest("hex") !== artifact.sha256) throw new Error(`${artifact.name}: размер или SHA-256 не совпадает с каталогом`);
    console.log(`PASS anonymous download: ${artifact.name}, ${size} bytes, SHA-256 verified`);
  }
}
if (require.main === module) checkDownloads().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { checkDownloads };
