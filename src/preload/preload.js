const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("desktopAPI", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  resize: (size) => ipcRenderer.invoke("resize-window", size),
  captureScreen: () => ipcRenderer.invoke("capture-screen"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  notify: (payload) => ipcRenderer.invoke("notify", payload),
  setIcon: (dataUrl) => ipcRenderer.invoke("app:set-icon", dataUrl)
})
