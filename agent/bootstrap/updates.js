"use strict";
// The bootstrap and its release key only change with the installed application.
// Downloaded application code is verified before every load, including offline starts.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const MAX_PACKAGE = 8 * 1024 * 1024;
function compare(a, b) {
  const parse = value => {
    if (!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(value)) throw new Error("Некорректная версия обновления");
    return value.split(".").map(Number);
  };
  const aa = parse(a), bb = parse(b);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  return 0;
}
function verifyManifest(envelope, key) {
  if (!envelope || envelope.schema !== 1 || typeof envelope.payload !== "string" || envelope.payload.length > 32_000 || typeof envelope.signature !== "string") throw new Error("Повреждён каталог обновлений");
  const bytes = Buffer.from(envelope.payload, "base64");
  if (!crypto.verify(null, bytes, key, Buffer.from(envelope.signature, "base64"))) throw new Error("Подпись обновления не подтверждена");
  const release = JSON.parse(bytes);
  compare(release.version, release.runtime);
  compare(release.minimumVersion, release.version);
  if (compare(release.minimumVersion, release.version) > 0 || release.file !== `qr-report-agent-code-${release.version}.asar` || !/^[a-f0-9]{64}$/.test(release.sha256) || !Number.isSafeInteger(release.size) || release.size < 1 || release.size > MAX_PACKAGE || !Array.isArray(release.notes) || release.notes.length > 10 || release.notes.some(note => typeof note !== "string" || note.length > 300)) throw new Error("Некорректные данные обновления");
  return release;
}
function verifyArchive(file, release) {
  // Electron patches fs to interpret .asar as a directory. original-fs reads its bytes.
  let rawFs = fs;
  if (process.versions.electron) rawFs = require("original-fs");
  const info = rawFs.lstatSync(file);
  if (!info.isFile() || info.size !== release.size) throw new Error("Размер пакета обновления не совпадает");
  if (crypto.createHash("sha256").update(rawFs.readFileSync(file)).digest("hex") !== release.sha256) throw new Error("Пакет обновления повреждён");
}
function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, file);
  } finally { fs.rmSync(temporary, { force: true }); }
}
class Updates extends EventEmitter {
  constructor({ directory, key, feed, runtime, bundledVersion = runtime, request = fetch }) {
    super();
    const url = new URL(feed);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Для обновлений нужен доверенный HTTPS-адрес");
    this.directory = directory; this.key = key; this.feed = url.href.replace(/\/?$/, "/");
    this.runtime = runtime; this.bundledVersion = bundledVersion; this.version = bundledVersion; this.request = request;
    this.file = path.join(directory, "state.json");
    this.state = { phase: "idle", message: "Обновления проверяются автоматически", version: "", progress: 0 };
    this.saved = {};
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (saved && typeof saved === "object" && !Array.isArray(saved)) this.saved = saved;
    } catch { /* Fresh install or interrupted metadata write. */ }
  }
  emitState(update) { this.state = { ...this.state, ...update }; this.emit("status", this.state); return this.state; }
  persist() { atomicJson(this.file, this.saved); }
  validate(envelope) {
    const release = verifyManifest(envelope, this.key);
    if (release.runtime !== this.runtime) throw new Error("Обновите установленное приложение, чтобы продолжить обновления");
    if (compare(release.version, this.runtime) < 0) throw new Error("Установка старой версии запрещена");
    verifyArchive(path.join(this.directory, release.file), release);
    return release;
  }
  selectCode() {
    if (this.saved.booting) {
      this.saved.rejected = this.saved.active;
      this.saved.active = this.saved.previous;
      this.saved.previous = null;
      this.saved.booting = false;
      this.emitState({ phase: "error", message: "Не удалось запустить обновление. Восстановлена предыдущая версия." });
      this.persist();
    }
    if (!this.saved.active) return null;
    try {
      const release = this.validate(this.saved.active);
      if (compare(release.version, this.bundledVersion) <= 0) return null;
      this.version = release.version;
      this.saved.booting = true; this.persist();
      return path.join(this.directory, release.file);
    } catch {
      this.saved.rejected = this.saved.active;
      this.saved.active = this.saved.previous; this.saved.previous = null;
      this.emitState({ phase: "error", message: "Обновление не прошло проверку. Восстановлена рабочая версия." });
      this.persist();
      return this.selectCode();
    }
  }
  markHealthy() {
    if (this.saved.booting) { this.saved.booting = false; this.persist(); }
  }
  restoreStaged() {
    if (!this.saved.staged) return false;
    try {
      const release = this.validate(this.saved.staged);
      if (compare(release.version, this.version) <= 0) return false;
      this.available = this.saved.staged;
      this.emitState({ phase: "ready", message: "Обновление готово к установке", progress: 100, version: release.version,
        required: compare(this.version, release.minimumVersion) < 0, notes: release.notes });
      return true;
    } catch { return false; }
  }
  check({ download = false } = {}) {
    if (this.pending) return this.pending;
    this.pending = this.checkRelease(download).catch(error => {
      if (!this.restoreStaged()) this.emitState({ phase: "error", message: error.message });
      return this.state;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  async read(url, limit, onProgress = () => {}) {
    const response = await this.request(url, { redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(response.status === 404 ? "Обновления ещё не опубликованы. Попробуйте позже." : `Сервер обновлений недоступен (HTTP ${response.status})`);
    if (Number(response.headers.get("content-length")) > limit) throw new Error("Пакет обновления слишком большой");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw new Error("Пакет обновления слишком большой");
      chunks.push(Buffer.from(chunk)); onProgress(size);
    }
    return Buffer.concat(chunks);
  }
  async checkRelease(download) {
    this.emitState({ phase: "checking", message: "Проверяем обновления…", progress: 0 });
    const envelope = JSON.parse(await this.read(`${this.feed}latest.json`, 40_000));
    const release = verifyManifest(envelope, this.key);
    this.available = envelope;
    if (compare(release.version, this.version) <= 0) return this.emitState({ phase: "current", message: "Установлена актуальная версия", version: this.version, required: false });
    let rejected;
    try { rejected = this.saved.rejected && verifyManifest(this.saved.rejected, this.key); } catch { /* A corrupt local catalog must not block future signed releases. */ }
    if (rejected && release.version === rejected.version) throw new Error("Этот выпуск не удалось запустить. Ожидаем исправленное обновление.");
    const required = compare(this.version, release.minimumVersion) < 0;
    if (release.runtime !== this.runtime) return this.emitState({ phase: "installer", message: "Для этого выпуска нужно обновить само приложение", version: release.version, required, notes: release.notes });
    if (this.saved.staged?.payload === envelope.payload && this.restoreStaged()) return this.state;
    this.emitState({ phase: "available", message: required ? "Нужно обновить агент" : "Доступно обновление", version: release.version, required, notes: release.notes });
    if (download) await this.download();
    return this.state;
  }
  async download() {
    if (this.downloading) return this.downloading;
    this.downloading = this.downloadRelease().catch(error => {
      this.emitState({ phase: "error", message: error.message });
      throw error;
    }).finally(() => { this.downloading = null; });
    return this.downloading;
  }
  async downloadRelease() {
    const envelope = this.available;
    const release = verifyManifest(envelope, this.key);
    if (release.runtime !== this.runtime || compare(release.version, this.version) <= 0) throw new Error("Для этой версии нет подходящего обновления");
    this.emitState({ phase: "downloading", message: "Загружаем обновление…", progress: 0 });
    const bytes = await this.read(`${this.feed}${release.file}`, release.size, size => this.emitState({ progress: Math.min(100, Math.round(size * 100 / release.size)) }));
    if (bytes.length !== release.size || crypto.createHash("sha256").update(bytes).digest("hex") !== release.sha256) throw new Error("Пакет обновления повреждён");
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(this.directory, `${release.file}.${crypto.randomUUID()}.part`);
    try {
      fs.writeFileSync(temporary, bytes, { mode: 0o600, flag: "wx" });
      fs.renameSync(temporary, path.join(this.directory, release.file));
    } finally { fs.rmSync(temporary, { force: true }); }
    this.saved.staged = envelope; this.persist();
    this.emitState({ phase: "ready", message: "Обновление готово к установке", progress: 100, version: release.version });
    return this.state;
  }
  activate() {
    const release = this.validate(this.saved.staged);
    if (compare(release.version, this.version) <= 0) throw new Error("Установка старой версии запрещена");
    this.saved.previous = this.saved.active || null;
    this.saved.active = this.saved.staged; this.saved.staged = null; this.saved.booting = false;
    this.persist();
  }
}
module.exports = { Updates, verifyManifest, verifyArchive, compare, atomicJson };
