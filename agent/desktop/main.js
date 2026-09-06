"use strict";
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, nativeTheme } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const tls = require("node:tls");
const core = require("../qa-report-agent");
const { parseLink, jiraFromForm } = require("./connection");

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
    name: config?.name || "", jiraUrl: config?.jira?.baseUrl || "", configured: Boolean(config?.jira?.token),
    loginSupported: process.platform !== "linux", autoStart: process.platform !== "linux" && app.getLoginItemSettings().openAtLogin,
    theme: config?.theme || "system", version: app.getVersion() };
}
function emit(update = {}) {
  status = { ...status, ...update };
  if (window && !window.isDestroyed()) window.webContents.send("agent:status", snapshot());
}
function show() {
  if (!window) {
    window = new BrowserWindow({ width: 600, height: 700, minWidth: 480, minHeight: 540, title: "QR Report Agent",
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
  running = core.run(config, { signal: controller.signal, onStatus: emit, version: app.getVersion(), onPreferences: (preferences) => {
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
  const answer = await dialog.showMessageBox(window, { type: "question", title: "Подключить QR Report?",
    message: `Разрешить задания от ${link.serverUrl}?`,
    detail: config?.secret ? "Это заменит текущую привязку. Сохранённый доступ к Jira останется на этом компьютере." : "Агент будет выполнять запросы к настроенной вами Jira. Продолжайте, если вы только что нажали кнопку подключения на этом сайте.",
    buttons: ["Отмена", "Подключить"], defaultId: 0, cancelId: 0 });
  if (answer.response !== 1) return;
  await exclusive(async () => {
    const next = await core.pairWithCode(link.serverUrl, link.code);
    if (config?.jira) next.jira = config.jira;
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
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("open-url", (event, url) => { event.preventDefault(); enqueueLink(url); });
  app.on("second-instance", (_event, argv) => { show(); enqueueLink(argv.find((arg) => arg.startsWith("qareport-agent:"))); });
  app.on("before-quit", () => { quitting = true; controller?.abort(); });
  app.on("window-all-closed", () => { if (!tray) app.quit(); });
  app.on("activate", show);
  app.whenReady().then(() => {
    if (app.isPackaged) app.setAsDefaultProtocolClient("qareport-agent");
    else app.setAsDefaultProtocolClient("qareport-agent", process.execPath, [path.resolve(__dirname, "..")]);
    try { config = core.readConfig(); if (config) config.desktop = true; } catch (error) { status.message = core.errorMessage(error); }
    nativeTheme.themeSource = config?.theme === "graphite" ? "dark" : config?.theme || "system";
    const icon = nativeImage.createFromPath(path.join(__dirname, "tray.png"));
    tray = new Tray(icon.resize({ width: 22, height: 22 }));
    tray.setToolTip("QR Report Agent");
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Открыть QR Report Agent", click: show },
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
    handle("save", (form) => exclusive(async () => {
      if (!config?.secret) throw new Error("Сначала подключите агент кнопкой в QR Report");
      const jira = jiraFromForm(form);
      await core.verifyJira(jira);
      await stop();
      const next = { ...config, jira };
      next.desktop = true; core.writeConfig(next); config = next; start();
      emit({ message: "Доступ сохранён" });
      return snapshot();
    }));
    handle("test", () => exclusive(async () => {
      if (!config?.jira) throw new Error("Сначала настройте доступ к Jira");
      const result = await core.verifyJira(config.jira);
      return `Jira доступна · ${result.payload.displayName || result.payload.name || "успешно"}.`;
    }));
    handle("auto-start", (enabled) => {
      if (typeof enabled !== "boolean" || process.platform === "linux") throw new Error("Автозапуск настройте средствами ОС");
      app.setLoginItemSettings({ openAtLogin: enabled });
      return snapshot();
    });
    show(); start();
    enqueueLink(process.argv.find((arg) => arg.startsWith("qareport-agent:")));
  }).catch((error) => { dialog.showErrorBox("QR Report Agent", core.errorMessage(error)); app.quit(); });
}
