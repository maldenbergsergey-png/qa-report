"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const manifest = require("./agent-release.json");
async function checksum(file) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function downloadRelease(directory = path.join(__dirname, "..", "downloads")) {
  await fs.promises.mkdir(directory, { recursive: true });
  for (const artifact of manifest.files) {
    const file = path.join(directory, artifact.name);
    if (fs.existsSync(file) && await checksum(file) === artifact.sha256) {
      console.log(`Verified: ${artifact.name}`); continue;
    }
    const temporary = `${file}.${crypto.randomUUID()}.part`;
    try {
      const response = await fetch(artifact.sourceUrl || `${manifest.baseUrl}/${artifact.name}`, { signal: AbortSignal.timeout(900_000) });
      if (!response.ok) throw new Error(`Download failed: ${artifact.name} (HTTP ${response.status})`);
      await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary, { flags: "wx" }));
      if (await checksum(temporary) !== artifact.sha256) throw new Error(`Checksum mismatch: ${artifact.name}`);
      await fs.promises.rename(temporary, file);
      console.log(`Downloaded and verified: ${artifact.name}`);
    } finally { await fs.promises.rm(temporary, { force: true }); }
  }
}
if (require.main === module) downloadRelease(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { checksum, downloadRelease };
