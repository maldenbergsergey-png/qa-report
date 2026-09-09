const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("agent", {
  state: () => ipcRenderer.invoke("agent:state"),
  ready: () => ipcRenderer.invoke("agent:ready"),
  save: (form) => ipcRenderer.invoke("agent:save", form),
  test: (id) => ipcRenderer.invoke("agent:test", id),
  remove: (id) => ipcRenderer.invoke("agent:remove", id),
  checkUpdate: () => ipcRenderer.invoke("agent:check-update"),
  downloadUpdate: () => ipcRenderer.invoke("agent:download-update"),
  installUpdate: () => ipcRenderer.invoke("agent:install-update"),
  automaticUpdates: (enabled) => ipcRenderer.invoke("agent:automatic-updates", enabled),
  openDownloads: () => ipcRenderer.invoke("agent:open-downloads"),
  autoStart: (enabled) => ipcRenderer.invoke("agent:auto-start", enabled),
  onStatus: (callback) => ipcRenderer.on("agent:status", (_event, value) => callback(value)),
});
