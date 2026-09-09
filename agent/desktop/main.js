"use strict";
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, nativeTheme, session } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const tls = require("node:tls");
const core = require("../qa-report-agent");
const { parseLink, jiraFromForm } = require("./connection");
const { createJiraTransport } = require("./network");
const { listJiras, migrateConfig, saveJira, removeJira, publicJiras } = require("../jira-profiles");
const { version } = require("../package.json");
const runtime = global.qaReportRuntime;
const updates = runtime?.updates;
let jobRunning = false, lastJobAt = Date.now();

// Keep the CLI configuration and corporate trust chain; never disable TLS verification.
if (tls.setDefaultCACertificates && tls.getCACertificates) {
  const extra = fs.existsSync(core.EXTRA_CA_FILE) ? [fs.readFileSync(core.EXTRA_CA_FILE, "utf8")] : [];
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system"), ...extra]);
}
let window, tray, config, controller, running, quitting = false, busy = false;
let status = { connected: false, message: "Подключите агент из настроек приложения" };
const page = pathToFileURL(path.join(__dirname, "index.html")).href;
let linkQueue = Promise.resolve();
function snapshot() {
  return { ...status, paired: Boolean(config?.secret), serverUrl: config?.serverUrl || "",
    name: config?.name || "", jiraUrl: listJiras(config)[0]?.baseUrl || "", configured: listJiras(config).length > 0,
    jiras: publicJiras(config), update: updates?.state, automaticUpdates: config?.automaticUpdates !== false, jobRunning,
    loginSupported: process.platform !== "linux", autoStart: process.platform !== "linux" && app.getLoginItemSettings().openAtLogin,
    theme: config?.theme || "system", version, runtimeVersion: app.getVersion() };
}
function emit(update = {}) {
  status = { ...status, ...update };
  if (window && !window.isDestroyed()) window.webContents.send("agent:status", snapshot());
}
function show() {
  if (!window) {
    window = new BrowserWindow({ width: 660, height: 820, minWidth: 520, minHeight: 600, title: "QA Report Agent",
      webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.setMenuBarVisibility(false);
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.on("close", (event) => { if (!quitting && tray) { event.preventDefault(); window.hide(); } });
    window.on("closed", () => { window = null; });
    window.loadFile(path.join(__dirname, "index.html"));
  }
  window.show(); window.focus();
}
async function stop() {
  controller?.abort();
  await running;
  running = null; controller = null;
}
function start() {
  if (running || !config?.secret) return;
  controller = new AbortController();
  running = core.run(config, { signal: controller.signal, onStatus: emit, version, onJob: (active) => { jobRunning = active; lastJobAt = Date.now(); emit(); }, onPreferences: (preferences) => {
    if (["light", "dark", "graphite"].includes(preferences.theme) && preferences.theme !== config.theme) {
      config.theme = preferences.theme; core.writeConfig(config);
      nativeTheme.themeSource = config.theme === "light" ? "light" : "dark";
    }
  } }).catch((error) => {
    emit({ connected: false, message: core.errorMessage(error) });
  });
}
async function exclusive(action) {
  if (busy) throw new Error("Дождитесь завершения текущего действия");
  busy = true;
  try { return await action(); } finally { busy = false; }
}
async function connectLink(raw) {
  show();
  const link = parseLink(raw);
  // An arbitrary website can open a registered protocol. Require local consent before rebinding.
  const answer = await dialog.showMessageBox(window, { type: "question", title: "Подключить QA Report?",
    message: `Разрешить задания от ${link.serverUrl}?`,
    detail: config?.secret ? "Это заменит текущую привязку. Сохранённый доступ к Jira останется на этом компьютере." : "Агент будет выполнять запросы к настроенной вами Jira. Продолжайте, если вы только что нажали кнопку подключения на этом сайте.",
    buttons: ["Отмена", "Подключить"], defaultId: 0, cancelId: 0 });
  if (answer.response !== 1) return;
  await exclusive(async () => {
    const next = await core.pairWithCode(link.serverUrl, link.code);
    next.jiras = listJiras(config);
    next.automaticUpdates = config?.automaticUpdates !== false;
    next.theme = link.theme || config?.theme || "system";
    nativeTheme.themeSource = next.theme === "graphite" ? "dark" : next.theme;
    await stop();
    next.desktop = true; core.writeConfig(next); config = next;
    emit({ connected: false, message: "Подключён" });
    start();
  });
}
function enqueueLink(raw) {
  if (!raw) return;
  linkQueue = linkQueue.then(() => app.whenReady()).then(() => connectLink(raw)).catch((error) => {
    emit({ message: core.errorMessage(error) });
  });
}
if (!runtime?.hasInstanceLock && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on("open-url", (event, url) => { event.preventDefault(); enqueueLink(url); });
  app.on("second-instance", (_event, argv) => { show(); enqueueLink(argv.find((arg) => arg.startsWith("qareport-agent:"))); });
  app.on("before-quit", () => { quitting = true; controller?.abort(); });
  app.on("window-all-closed", () => { if (!tray) app.quit(); });
  app.on("activate", show);
  app.whenReady().then(() => {
    core.setJiraTransport(createJiraTransport(session.fromPartition("qa-report-jira", { cache: false })));
    if (updates) {
      const updateSession = session.fromPartition("qa-report-updates", { cache: false });
      updates.request = (url, options) => updateSession.fetch(url, { ...options, credentials: "omit" });
    }
    if (!process.env.QA_REPORT_AGENT_CONFIG_DIR) {
      if (app.isPackaged) app.setAsDefaultProtocolClient("qareport-agent");
      else app.setAsDefaultProtocolClient("qareport-agent", process.execPath, [path.resolve(__dirname, "..")]);
    }
    try { config = core.readConfig(); if (config) { config = migrateConfig(config); config.desktop = true; core.writeConfig(config); } } catch (error) { status.message = core.errorMessage(error); }
    nativeTheme.themeSource = config?.theme === "graphite" ? "dark" : config?.theme || "system";
    const icon = nativeImage.createFromPath(path.join(__dirname, "tray.png"));
    tray = new Tray(icon.resize({ width: 22, height: 22 }));
    tray.setToolTip("QA Report Agent");
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Открыть QA Report Agent", click: show },
      { label: "Завершить работу агента", click: () => app.quit() }]));
    tray.on("click", show);
    function handle(name, action) {
      ipcMain.handle(`agent:${name}`, async (event, payload) => {
        if (event.sender !== window?.webContents || event.senderFrame?.url !== page) throw new Error("Недопустимый источник");
        try { return { ok: true, value: await action(payload) }; }
        catch (error) { return { ok: false, error: core.errorMessage(error) }; }
      });
    }
    handle("state", snapshot);
    handle("ready", () => runtime?.ready());
    handle("save", (form) => exclusive(async () => {
      if (!config?.secret) throw new Error("Сначала подключите агент кнопкой в QA Report");
      const jira = jiraFromForm(form);
      const next = saveJira(config, jira, form.id || "", form.label);
      await core.verifyJira(jira);
      await stop();
      next.desktop = true; core.writeConfig(next); config = next; start();
      emit({ message: "Подключение Jira сохранено" });
      return snapshot();
    }));
    handle("test", (id) => exclusive(async () => {
      const jira = listJiras(config).find(item => item.id === id);
      if (!jira) throw new Error("Выберите подключение Jira");
      const result = await core.verifyJira(jira);
      return `Jira доступна · ${result.payload.displayName || result.payload.name || "успешно"}.`;
    }));
    handle("remove", (id) => exclusive(async () => {
      const jira = listJiras(config).find(item => item.id === id);
      if (!jira) throw new Error("Подключение Jira уже удалено");
      const answer = await dialog.showMessageBox(window, { type: "question", title: "Удалить подключение?",
        message: `Удалить доступ к ${jira.label || jira.baseUrl}?`, detail: "Чтобы снова работать с этой Jira, потребуется добавить её данные входа.",
        buttons: ["Отмена", "Удалить"], defaultId: 0, cancelId: 0 });
      if (answer.response !== 1) return snapshot();
      const next = removeJira(config, id);
      await stop(); core.writeConfig(next); config = next; start(); emit();
      return snapshot();
    }));
    handle("check-update", async () => { await updates.check(); return snapshot(); });
    handle("download-update", async () => { await updates.download(); return snapshot(); });
    async function installUpdate() {
      await exclusive(async () => {
        // stop aborts polling, then waits for the current Jira request and its result.
        emit({ message: "Завершаем работу перед обновлением…" });
        await stop();
        try { updates.activate(); app.relaunch(); quitting = true; app.quit(); }
        catch (error) { start(); throw error; }
      });
    }
    handle("install-update", installUpdate);
    handle("automatic-updates", (enabled) => {
      if (typeof enabled !== "boolean") throw new Error("Некорректная настройка обновлений");
      config = { ...config, automaticUpdates: enabled }; core.writeConfig(config);
      return snapshot();
    });
    handle("open-downloads", () => require("electron").shell.openExternal("https://qa-report.mlbrg.ru/"));
    if (updates) {
      updates.on("status", () => emit());
      const check = () => updates.check({ download: config?.automaticUpdates !== false });
      setTimeout(check, 10_000).unref();
      setInterval(check, 6 * 60 * 60 * 1000).unref();
      setInterval(() => {
        if (config?.automaticUpdates !== false && updates.state.phase === "ready" && !jobRunning && !busy && !window?.isVisible() && Date.now() - lastJobAt > 120_000) {
          installUpdate().catch(error => updates.emitState({ phase: "error", message: core.errorMessage(error) }));
        }
      }, 15_000).unref();
    }
    handle("auto-start", (enabled) => {
      if (typeof enabled !== "boolean" || process.platform === "linux") throw new Error("Автозапуск настройте средствами ОС");
      app.setLoginItemSettings({ openAtLogin: enabled });
      return snapshot();
    });
    show(); start();
    enqueueLink(process.argv.find((arg) => arg.startsWith("qareport-agent:")));
  }).catch((error) => { dialog.showErrorBox("QA Report Agent", core.errorMessage(error)); app.quit(); });
}
