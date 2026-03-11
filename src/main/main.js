const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Menu, Notification } = require("electron")
const fs = require("node:fs")
const path = require("node:path")

const defaultSettings = {
  aiProvider: "openai_compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  language: "zh-CN",
  nickname: "",
  job: "",
  currentFocus: "",
  soundEnabled: true,
  soundTheme: "jelly",
  soundVolume: 65
}

let mainWindow

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8")
    return fallback
  }
  const raw = fs.readFileSync(filePath, "utf-8")
  try {
    const data = JSON.parse(raw)
    return { ...fallback, ...data }
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8")
    return fallback
  }
}

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json")
}

function readSettings() {
  return ensureJsonFile(getSettingsPath(), defaultSettings)
}

function saveSettings(settings) {
  const merged = { ...defaultSettings, ...settings }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2), "utf-8")
  return merged
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    maxWidth: 600,
    maxHeight: 800,
    transparent: true,
    frame: false,
    hasShadow: false, // 我们自己处理阴影，或者使用 mac 的 vibrancy
    vibrancy: "under-window", // MacOS 模糊效果
    visualEffectState: "active",
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 设置菜单以支持原生快捷键 (如 Cmd+V)
  const template = [
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // 默认位置：右上角
  const { width } = screen.getPrimaryDisplay().workAreaSize
  mainWindow.setPosition(width - 360, 100)

  // 设置 Dock 图标 (macOS)
  if (process.platform === "darwin") {
    const pngPath = path.join(__dirname, "../renderer/app-icon.png")
    if (fs.existsSync(pngPath)) {
      app.dock.setIcon(pngPath)
    }
  }

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
}

ipcMain.handle("app:set-icon", (_, dataUrl) => {
  if (!dataUrl) return
  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
    const iconPath = path.join(__dirname, "../renderer/app-icon.png")
    fs.writeFileSync(iconPath, base64Data, "base64")
    if (process.platform === "darwin") {
      app.dock.setIcon(iconPath)
    }
    return true
  } catch (e) {
    console.error("Failed to save icon:", e)
    return false
  }
})

ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle("resize-window", (event, { width, height }) => {
    if (mainWindow) {
      mainWindow.setMinimumSize(width, height) // 必须先调整最小尺寸限制
      mainWindow.setSize(width, height)
    }
  })

ipcMain.handle("settings:get", () => readSettings())

ipcMain.handle("settings:save", (_, settings) => saveSettings(settings))

ipcMain.handle("notify", (_, { title, body }) => {
  if (!Notification.isSupported()) return false
  const notification = new Notification({
    title: title || "Hooly 提醒",
    body: body || ""
  })
  notification.show()
  return true
})

// 截图
ipcMain.handle("capture-screen", async () => {
  // 1. 隐藏窗口
  mainWindow.hide()

  // 2. 等待窗口完全隐藏
  await new Promise((resolve) => setTimeout(resolve, 300))

  try {
    const displays = screen.getAllDisplays()
    // 这里为了简单，只截取主屏幕，如果要支持多屏可以选择或者拼接
    const primaryDisplay = screen.getPrimaryDisplay()
    
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: primaryDisplay.size
    })

    // 找到主屏幕的 source
    const source = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0]
    
    // 3. 恢复窗口
    mainWindow.show()
    
    return source.thumbnail.toDataURL()
  } catch (error) {
    mainWindow.show()
    throw error
  }
})

app.whenReady().then(() => {
  readSettings()
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
