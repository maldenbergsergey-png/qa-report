const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("agent", {
  state: () => ipcRenderer.invoke("agent:state"),
  save: (form) => ipcRenderer.invoke("agent:save", form),
  test: () => ipcRenderer.invoke("agent:test"),
  autoStart: (enabled) => ipcRenderer.invoke("agent:auto-start", enabled),
  onStatus: (callback) => ipcRenderer.on("agent:status", (_event, value) => callback(value)),
});
