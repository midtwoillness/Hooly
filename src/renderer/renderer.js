const todoList = document.getElementById("todoList")
const microInput = document.getElementById("microInput")
const captureBtn = document.getElementById("captureBtn")
const addBtn = document.getElementById("addBtn")
const dropOverlay = document.getElementById("dropOverlay")
const fileInput = document.getElementById("fileInput")
const closeBtn = document.getElementById("closeBtn")
const openSettingsBtn = document.getElementById("openSettingsBtn")
const settingsModal = document.getElementById("settingsModal")
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn")
const saveSettingsBtn = document.getElementById("saveSettingsBtn")
const baseUrlInput = document.getElementById("baseUrlInput")
const apiKeyInput = document.getElementById("apiKeyInput")
const modelInput = document.getElementById("modelInput")
const nicknameInput = document.getElementById("nicknameInput")
const jobInput = document.getElementById("jobInput")
const focusInput = document.getElementById("focusInput")
const soundEnabledInput = document.getElementById("soundEnabledInput")
const soundThemeInput = document.getElementById("soundThemeInput")
const soundVolumeInput = document.getElementById("soundVolumeInput")
const calendarBtn = document.getElementById("calendarBtn")
const calendarView = document.getElementById("calendarView")
const prevMonthBtn = document.getElementById("prevMonthBtn")
const nextMonthBtn = document.getElementById("nextMonthBtn")
const calendarTitle = document.getElementById("calendarTitle")
const calendarGrid = document.getElementById("calendarGrid")
const detailDateTitle = document.getElementById("detailDateTitle")
const detailList = document.getElementById("detailList")

let todos = []
let projectMemory = []
let settingsCache = null
let draggingTodoId = null
let audioCtx = null
let audioUnlocked = false
let currentCalendarDate = new Date()
let selectedDate = new Date()

const UNGROUPED_KEY = "__UNGROUPED__"

function groupToKey(group) {
  return group || UNGROUPED_KEY
}

function keyToGroup(key) {
  return key === UNGROUPED_KEY ? null : key
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

function unlockAudio() {
  const ctx = getAudioContext()
  if (!ctx || audioUnlocked) return
  ctx.resume()
  audioUnlocked = true
}

function playCuteSound(type = "tap") {
  if (settingsCache && settingsCache.soundEnabled === false) return
  
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume()
  const now = ctx.currentTime
  const theme = (settingsCache && settingsCache.soundTheme) || "cute"
  const volume = (settingsCache && typeof settingsCache.soundVolume === 'number' ? settingsCache.soundVolume : 50) / 100
  
  const themes = {
    cute: {
      tap: [659.25, 783.99],
      success: [659.25, 783.99, 987.77],
      notify: [523.25, 659.25, 783.99, 1046.5],
      wave: "triangle",
      decay: 0.16,
      interval: 0.09
    },
    pixel: {
      tap: [440, 880],
      success: [440, 880, 1760],
      notify: [880, 1174.66, 1760],
      wave: "square",
      decay: 0.08,
      interval: 0.06
    },
    bubble: {
      tap: [300, 500],
      success: [300, 500, 800],
      notify: [300, 500, 800, 1200],
      wave: "sine",
      decay: 0.2,
      interval: 0.08
    }
  }

  const config = themes[theme] || themes.cute
  const notes = config[type] || config.tap

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = config.wave
    
    // 果冻泡泡特效：滑音
    if (theme === 'bubble') {
      osc.frequency.setValueAtTime(freq, now + idx * config.interval)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * config.interval + config.decay)
    } else {
      osc.frequency.setValueAtTime(freq, now)
    }

    gain.gain.setValueAtTime(0.0001, now + idx * config.interval)
    gain.gain.exponentialRampToValueAtTime(volume * 0.3, now + idx * config.interval + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * config.interval + config.decay)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + idx * config.interval)
    osc.stop(now + idx * config.interval + config.decay + 0.05)
  })
}

function loadTodos() {
  const saved = localStorage.getItem("todos")
  if (!saved) return
  try {
    const parsed = JSON.parse(saved)
    todos = Array.isArray(parsed) ? parsed.map((item) => ({
      ...item,
      remindAt: item?.remindAt || null,
      reminded: Boolean(item?.reminded),
      startDate: item?.startDate || null,
      endDate: item?.endDate || null
    })) : []
  } catch {
    todos = []
  }

  // 加载项目记忆
  const savedProjects = localStorage.getItem("projectMemory")
  if (savedProjects) {
    try {
      projectMemory = JSON.parse(savedProjects)
    } catch {
      projectMemory = []
    }
  }
}

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos))
  localStorage.setItem("projectMemory", JSON.stringify(projectMemory))
}

function createGroupBlock(groupName, items, showTitle = true) {
  const groupEl = document.createElement("div")
  groupEl.className = "todo-group"

  if (showTitle) {
    const title = document.createElement("div")
    title.className = "group-title"
    title.textContent = groupName || "未分类"
    groupEl.appendChild(title)
  }

  const list = document.createElement("ul")
  list.className = "group-list"
  list.dataset.group = groupToKey(groupName)
  list.addEventListener("dragover", handleGroupDragOver)
  list.addEventListener("dragleave", handleGroupDragLeave)
  list.addEventListener("drop", handleGroupDrop)

  for (const item of items) list.appendChild(createTodoItem(item))
  groupEl.appendChild(list)
  return groupEl
}

function renderTodos() {
  todoList.innerHTML = ""
  if (!todos.length) {
    const li = document.createElement("li")
    li.className = "empty-state"
    li.innerHTML = "<div class=\"empty-hint\">粘贴图片 / 文本，或点击截图<br/>AI 自动生成待办</div>"
    todoList.appendChild(li)
    return
  }

  const grouped = new Map()
  const rest = []
  for (const item of todos) {
    if (item.group) {
      if (!grouped.has(item.group)) grouped.set(item.group, [])
      grouped.get(item.group).push(item)
    } else {
      rest.push(item)
    }
  }

  for (const [groupName, items] of grouped.entries()) {
    todoList.appendChild(createGroupBlock(groupName, items, true))
  }

  if (rest.length) {
    todoList.appendChild(createGroupBlock(null, rest, grouped.size > 0))
  }
}

function createTodoItem(todo) {
  const li = document.createElement("li")
  li.className = `todo-item${todo.done ? " done" : ""}`
  li.dataset.id = todo.id
  li.draggable = true
  li.addEventListener("dragstart", (event) => {
    draggingTodoId = todo.id
    li.classList.add("dragging")
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("application/x-todo-id", todo.id)
  })
  li.addEventListener("dragend", () => {
    draggingTodoId = null
    li.classList.remove("dragging")
    clearDragOverState()
  })

  const check = document.createElement("button")
  check.className = "checkbox"
  check.type = "button"
  check.addEventListener("click", () => {
    const hit = todos.find((t) => t.id === todo.id)
    if (!hit) return
    hit.done = !hit.done
    saveTodos()
    renderTodos()
    playCuteSound("success")
  })

  const content = document.createElement("div")
  content.className = "content-editable"
  content.contentEditable = "true"
  content.draggable = false
  content.textContent = todo.content
  content.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      content.blur()
    }
  })
  content.addEventListener("blur", () => {
    const val = content.textContent.trim()
    const hit = todos.find((t) => t.id === todo.id)
    if (!hit) return
    if (!val) {
      todos = todos.filter((t) => t.id !== todo.id)
    } else {
      hit.content = val
    }
    saveTodos()
    renderTodos()
  })

  const del = document.createElement("button")
  del.className = "delete-btn"
  del.type = "button"
  del.textContent = "×"
  del.addEventListener("click", () => {
    todos = todos.filter((t) => t.id !== todo.id)
    saveTodos()
    renderTodos()
  })

  const meta = document.createElement("div")
  meta.className = "todo-meta"
  const reminderText = document.createElement("span")
  reminderText.className = "reminder-text"
  reminderText.textContent = formatReminder(todo.remindAt)
  if (!todo.remindAt) reminderText.classList.add("hidden")

  const reminderBtn = document.createElement("button")
  reminderBtn.className = "reminder-btn"
  reminderBtn.type = "button"
  reminderBtn.title = "设置提醒时间"
  reminderBtn.textContent = todo.remindAt ? "🕒" : "⏰"

  const dateBtn = document.createElement("button")
  dateBtn.className = "date-btn"
  dateBtn.type = "button"
  dateBtn.title = "设置日期区间"
  dateBtn.textContent = (todo.startDate || todo.endDate) ? "📅" : "📆"

  const reminderInput = document.createElement("input")
  reminderInput.type = "datetime-local"
  reminderInput.className = "reminder-input hidden"
  if (todo.remindAt) reminderInput.value = toDatetimeLocal(todo.remindAt)
  reminderInput.addEventListener("change", () => {
    const hit = todos.find((t) => t.id === todo.id)
    if (!hit) return
    if (!reminderInput.value) {
      hit.remindAt = null
      hit.reminded = false
    } else {
      const ts = new Date(reminderInput.value).toISOString()
      hit.remindAt = ts
      hit.reminded = false
    }
    saveTodos()
    renderTodos()
    playCuteSound("tap")
  })

  const dateModal = document.createElement("div")
  dateModal.className = "todo-date-popover hidden"
  dateModal.innerHTML = `
    <div class="popover-row">
      <label>开始</label>
      <input type="date" class="start-date-input" value="${todo.startDate || ""}">
    </div>
    <div class="popover-row">
      <label>结束</label>
      <input type="date" class="end-date-input" value="${todo.endDate || ""}">
    </div>
    <div class="popover-actions">
      <button class="clear-date-btn">清除</button>
      <button class="save-date-btn">确定</button>
    </div>
  `
  
  dateModal.querySelector(".save-date-btn").addEventListener("click", () => {
    const start = dateModal.querySelector(".start-date-input").value
    const end = dateModal.querySelector(".end-date-input").value
    const hit = todos.find((t) => t.id === todo.id)
    if (hit) {
      hit.startDate = start || null
      hit.endDate = end || null
      saveTodos()
      renderTodos()
      playCuteSound("tap")
    }
  })

  dateModal.querySelector(".clear-date-btn").addEventListener("click", () => {
    const hit = todos.find((t) => t.id === todo.id)
    if (hit) {
      hit.startDate = null
      hit.endDate = null
      saveTodos()
      renderTodos()
      playCuteSound("tap")
    }
  })

  reminderBtn.addEventListener("click", () => {
    if (todo.remindAt) {
      const shouldClear = confirm("已设置提醒，是否清除提醒时间？")
      if (shouldClear) {
        const hit = todos.find((t) => t.id === todo.id)
        if (!hit) return
        hit.remindAt = null
        hit.reminded = false
        saveTodos()
        renderTodos()
        playCuteSound("tap")
      }
      return
    }
    if (typeof reminderInput.showPicker === "function") reminderInput.showPicker()
    else reminderInput.click()
  })

  dateBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    // 关闭其他可能打开的 popover
    document.querySelectorAll(".todo-date-popover").forEach(p => {
      if (p !== dateModal) p.classList.add("hidden")
    })
    dateModal.classList.toggle("hidden")
  })

  // 点击外部关闭 popover
  const closePopover = (e) => {
    if (!dateModal.contains(e.target) && e.target !== dateBtn) {
      dateModal.classList.add("hidden")
      document.removeEventListener("click", closePopover)
    }
  }
  if (!dateModal.classList.contains("hidden")) {
    document.addEventListener("click", closePopover)
  }

  li.appendChild(check)
  li.appendChild(content)
  
  const dateRangeText = document.createElement("span")
  dateRangeText.className = "date-range-text"
  if (todo.startDate || todo.endDate) {
    const s = todo.startDate ? todo.startDate.slice(5) : "?"
    const e = todo.endDate ? todo.endDate.slice(5) : "?"
    dateRangeText.textContent = `${s} ~ ${e}`
  } else {
    dateRangeText.classList.add("hidden")
  }

  meta.appendChild(dateRangeText)
  meta.appendChild(reminderText)
  meta.appendChild(dateBtn)
  meta.appendChild(reminderBtn)
  meta.appendChild(reminderInput)
  meta.appendChild(dateModal)
  li.appendChild(meta)
  li.appendChild(del)
  return li
}

function clearDragOverState() {
  for (const el of document.querySelectorAll(".group-list.drag-over")) {
    el.classList.remove("drag-over")
  }
}

function getDropBeforeId(listEl, clientY) {
  const items = Array.from(listEl.querySelectorAll(".todo-item:not(.dragging)"))
  for (const item of items) {
    const rect = item.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return item.dataset.id
  }
  return null
}

function moveTodoToGroup(todoId, targetGroup, beforeId = null) {
  const currentIndex = todos.findIndex((t) => t.id === todoId)
  if (currentIndex < 0) return
  const moving = todos[currentIndex]
  moving.group = targetGroup
  todos.splice(currentIndex, 1)

  let insertIndex = todos.length
  if (beforeId) {
    const beforeIndex = todos.findIndex((t) => t.id === beforeId)
    if (beforeIndex >= 0) insertIndex = beforeIndex
  } else if (targetGroup) {
    let lastInGroup = -1
    for (let i = 0; i < todos.length; i += 1) {
      if (todos[i].group === targetGroup) lastInGroup = i
    }
    if (lastInGroup >= 0) insertIndex = lastInGroup + 1
  } else {
    let lastUngrouped = -1
    for (let i = 0; i < todos.length; i += 1) {
      if (!todos[i].group) lastUngrouped = i
    }
    if (lastUngrouped >= 0) insertIndex = lastUngrouped + 1
  }

  todos.splice(insertIndex, 0, moving)
  saveTodos()
  renderTodos()
}

function toDatetimeLocal(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function formatReminder(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hour = `${date.getHours()}`.padStart(2, "0")
  const minute = `${date.getMinutes()}`.padStart(2, "0")
  return `提醒 ${month}-${day} ${hour}:${minute}`
}

async function checkReminders() {
  const now = Date.now()
  let changed = false
  for (const item of todos) {
    if (!item.remindAt || item.reminded) continue
    const remindTs = new Date(item.remindAt).getTime()
    if (Number.isNaN(remindTs)) continue
    if (remindTs > now) continue
    await window.desktopAPI.notify({
      title: `待办提醒：${item.group || "未分类"}`,
      body: item.content
    })
    playCuteSound("notify")
    item.reminded = true
    changed = true
  }
  if (changed) {
    saveTodos()
    renderTodos()
  }
}

function overlay(text, icon) {
  dropOverlay.querySelector(".overlay-text").textContent = text
  dropOverlay.classList.remove("hidden")
}

function hideOverlay() {
  dropOverlay.classList.add("hidden")
  dropOverlay.querySelector(".overlay-text").textContent = "释放以分析"
}

function getChatUrl(baseUrl) {
  const raw = String(baseUrl || "").trim()
  if (!raw) throw new Error("Base URL 不能为空")
  if (!/^https?:\/\//i.test(raw)) throw new Error("Base URL 必须以 http:// 或 https:// 开头")
  const fixed = raw.endsWith("/") ? raw.slice(0, -1) : raw
  if (fixed.endsWith("/chat/completions")) return fixed
  return `${fixed}/chat/completions`
}

function buildPrompt() {
  const { nickname, job, currentFocus } = settingsCache || {}
  
  let userContext = "用户画像："
  if (nickname) userContext += `昵称 ${nickname}，`
  if (job) userContext += `职业 ${job}，`
  if (currentFocus) userContext += `当前正专注于 ${currentFocus}。`
  
  // 获取所有历史分组名，并去重（结合当前待办和项目记忆）
  const currentGroups = todos.map(t => t.group).filter(Boolean)
  const allGroups = [...new Set([...projectMemory, ...currentGroups])]
  
  let groupContext = ""
  if (allGroups.length > 0) {
    groupContext = `你之前的任务主要归类在这些项目/分组下：${allGroups.join("、")}。`
  }
  
  // 获取最近的5条待办作为历史上下文
  const history = todos.slice(-5).map(t => t.content).join("；")
  let historyContext = ""
  if (history) {
    historyContext = `最近完成的具体事项供参考：${history}。`
  }

  return `你是一个高效的个人项目管理助手，专注于将杂乱的信息整理为以“项目”或“当前重心”为维度的待办清单。
${userContext}
${groupContext}
${historyContext}

分类原则（非常重要）：
1. 优先使用“当前正专注于”中提到的事项作为分组名（例如用户说正专注于“装修”，那么买水泥、联系工人都归入“装修”组）。
2. 如果输入内容明显属于“之前的任务分组”中的某一个，请直接沿用该分组名，不要创造近义词（例如已有“Q3述职”，不要新建“述职工作”）。
3. 如果是全新的事情，请根据内容提炼一个具体的项目名（如“xx项目”、“xx旅行”），而不是宽泛的“工作”、“个人”。
4. 只有确实无法归类到具体项目的事项，才放入“杂项”或不分组。

请分析输入内容，提取待办事项并按上述原则归类。
返回严格JSON，格式为：{ "groups": [ { "name": "项目名/分组名", "todos": ["待办1", "待办2"] } ] }。`
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("读取图片失败"))
    reader.readAsDataURL(file)
  })
}

async function loadSettings() {
  settingsCache = await window.desktopAPI.getSettings()
  baseUrlInput.value = settingsCache.baseUrl || ""
  apiKeyInput.value = settingsCache.apiKey || ""
  modelInput.value = settingsCache.model || "gpt-4o-mini"
  nicknameInput.value = settingsCache.nickname || ""
  jobInput.value = settingsCache.job || ""
  focusInput.value = settingsCache.currentFocus || ""
  soundEnabledInput.checked = settingsCache.soundEnabled !== false
  soundThemeInput.value = settingsCache.soundTheme || "cute"
  soundVolumeInput.value = typeof settingsCache.soundVolume === 'number' ? settingsCache.soundVolume : 50

  // 如果没有配置过，自动弹出设置
  if (!settingsCache.apiKey || !settingsCache.baseUrl) {
    settingsModal.classList.remove("hidden")
  }
}

async function saveSettings() {
  settingsCache = await window.desktopAPI.saveSettings({
    baseUrl: baseUrlInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim(),
    nickname: nicknameInput.value.trim(),
    job: jobInput.value.trim(),
    currentFocus: focusInput.value.trim(),
    soundEnabled: soundEnabledInput.checked,
    soundTheme: soundThemeInput.value,
    soundVolume: Number(soundVolumeInput.value)
  })
  settingsModal.classList.add("hidden")
  if (settingsCache.soundEnabled !== false) {
    playCuteSound("success")
  }

  // 尝试设置应用图标 (SVG -> PNG)
  syncAppIcon()
}

function syncAppIcon() {
  const appIcon = document.querySelector(".app-svg")
  if (!appIcon) return
  
  const doSync = () => {
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext("2d")
      ctx.drawImage(appIcon, 0, 0, 512, 512)
      const dataUrl = canvas.toDataURL("image/png")
      window.desktopAPI.setIcon(dataUrl)
    } catch (e) {
      console.error("Icon sync failed", e)
    }
  }

  if (appIcon.complete) doSync()
  else appIcon.onload = doSync
}

function renderDayDetails(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()]
  
  detailDateTitle.textContent = `${month}月${day}日 周${weekDay}`
  detailList.innerHTML = ""
  
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  const dayTodos = todos.filter(t => {
    if (t.remindAt && t.remindAt.startsWith(dateStr)) return true
    if (t.startDate && t.endDate) {
      return dateStr >= t.startDate && dateStr <= t.endDate
    }
    if (t.startDate && dateStr === t.startDate) return true
    return false
  })
  
  if (dayTodos.length === 0) {
    const emptyEl = document.createElement("li")
    emptyEl.className = "detail-empty"
    emptyEl.textContent = "今天没有待办事项"
    detailList.appendChild(emptyEl)
    return
  }
  
  dayTodos.forEach(t => {
    const li = document.createElement("li")
    li.className = `detail-item${t.done ? " done" : ""}`
    
    const timeEl = document.createElement("span")
    timeEl.className = "detail-time"
    if (t.remindAt && t.remindAt.startsWith(dateStr)) {
      const d = new Date(t.remindAt)
      timeEl.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } else {
      timeEl.textContent = "全天"
      timeEl.style.background = "#f0f0f0"
      timeEl.style.color = "#999"
    }
    
    const contentEl = document.createElement("span")
    contentEl.className = "detail-content"
    contentEl.textContent = t.content
    
    li.appendChild(timeEl)
    li.appendChild(contentEl)
    detailList.appendChild(li)
  })
}

function renderCalendar() {
  const year = currentCalendarDate.getFullYear()
  const month = currentCalendarDate.getMonth() // 0-11
  
  calendarTitle.textContent = `${year}年${month + 1}月`
  calendarGrid.innerHTML = ""
  
  // 表头
  const weeks = ["日", "一", "二", "三", "四", "五", "六"]
  weeks.forEach(w => {
    const el = document.createElement("div")
    el.className = "calendar-day-header"
    el.textContent = w
    calendarGrid.appendChild(el)
  })

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0(周日)-6

  // 填充空白
  for (let i = 0; i < startDayOfWeek; i++) {
    const el = document.createElement("div")
    el.className = "calendar-cell empty"
    calendarGrid.appendChild(el)
  }

  // 填充日期
  const today = new Date()
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement("div")
    el.className = "calendar-cell"
    
    const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d
    if (isSelected) el.classList.add("selected")
    
    // 检查是否今天
    if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
      el.classList.add("today")
    }

    const dateNum = document.createElement("div")
    dateNum.className = "calendar-date-num"
    dateNum.textContent = d
    el.appendChild(dateNum)

    // 检查是否有待办
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    
    // 筛选当天的待办
    const dayTodos = todos.filter(t => {
      if (t.remindAt && t.remindAt.startsWith(dateStr)) return true
      if (t.startDate && t.endDate) {
        return dateStr >= t.startDate && dateStr <= t.endDate
      }
      if (t.startDate && dateStr === t.startDate) return true
      return false
    })

    // 渲染小圆点
    const dotsContainer = document.createElement("div")
    dotsContainer.className = "calendar-dots"
    
    dayTodos.forEach(t => {
      const dot = document.createElement("div")
      dot.className = "calendar-dot"
      if (t.remindAt && t.remindAt.startsWith(dateStr)) {
        dot.classList.add("has-reminder")
      }
      dotsContainer.appendChild(dot)
    })
    
    el.appendChild(dotsContainer)
    
    // 点击交互
    el.addEventListener("click", () => {
      selectedDate = new Date(year, month, d)
      renderCalendar() // 重新渲染以更新选中样式
      renderDayDetails(selectedDate)
      playCuteSound("tap")
    })

    calendarGrid.appendChild(el)
  }
  
  // 首次渲染详情（如果是刚切换到日历视图）
  if (calendarGrid.childElementCount > 7 && detailList.innerHTML === "") {
    renderDayDetails(selectedDate)
  }
}

async function analyzeByAI(textContent, imageDataUrl, preferredGroup = undefined) {
  if (!settingsCache) await loadSettings()
  const { apiKey, baseUrl, model } = settingsCache
  if (!apiKey || !baseUrl) {
    alert("请先在设置中配置 API Key 和 Base URL")
    return
  }

  overlay("AI 正在整理待办…", "✨")
  const messages = [{ role: "user", content: [{ type: "text", text: buildPrompt() }] }]
  if (textContent) messages[0].content.push({ type: "text", text: `文本内容：\n${textContent}` })
  if (imageDataUrl) messages[0].content.push({ type: "image_url", image_url: { url: imageDataUrl } })

  try {
    const response = await fetch(getChatUrl(baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    })
    if (!response.ok) throw new Error("AI 请求失败")

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content || "{}"
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("AI 返回格式错误")
      parsed = JSON.parse(jsonMatch[0])
    }

    let changed = false
    if (Array.isArray(parsed.groups)) {
      for (const g of parsed.groups) {
        const name = preferredGroup !== undefined ? preferredGroup : ((g?.name || "").trim() || null)
        if (!Array.isArray(g?.todos)) continue
        for (const t of g.todos) {
          const content = String(t || "").trim()
          if (!content) continue
          todos.push({ id: id(), content, group: name, done: false, remindAt: null, reminded: false, startDate: null, endDate: null })
          if (name && !projectMemory.includes(name)) {
            projectMemory.push(name)
          }
          changed = true
        }
      }
    } else if (Array.isArray(parsed.todos)) {
      for (const t of parsed.todos) {
        const content = String(t || "").trim()
        if (!content) continue
        todos.push({ id: id(), content, group: preferredGroup !== undefined ? preferredGroup : null, done: false, remindAt: null, reminded: false, startDate: null, endDate: null })
        changed = true
      }
    }

    if (changed) {
      saveTodos() // 这里会同时保存项目记忆
      renderTodos()
      playCuteSound("success")
    }
  } catch (error) {
    const message = String(error?.message || "")
    if (message.includes("Failed to fetch")) {
      alert("分析失败：无法连接到 AI 服务。请检查 Base URL、网络连接或代理设置。")
    } else {
      alert(`分析失败：${message}`)
    }
  } finally {
    hideOverlay()
  }
}

function isExternalPayload(dataTransfer) {
  if (!dataTransfer) return false
  if (draggingTodoId) return false
  const types = Array.from(dataTransfer.types || [])
  return types.includes("Files") || types.includes("text/plain") || types.includes("text")
}

function handleGroupDragOver(event) {
  if (!draggingTodoId && !isExternalPayload(event.dataTransfer)) return
  event.preventDefault()
  event.stopPropagation()
  event.currentTarget.classList.add("drag-over")
}

function handleGroupDragLeave(event) {
  event.currentTarget.classList.remove("drag-over")
}

async function handleGroupDrop(event) {
  event.preventDefault()
  event.stopPropagation()
  const listEl = event.currentTarget
  listEl.classList.remove("drag-over")
  const targetGroup = keyToGroup(listEl.dataset.group)

  if (draggingTodoId) {
    const beforeId = getDropBeforeId(listEl, event.clientY)
    moveTodoToGroup(draggingTodoId, targetGroup, beforeId)
    hideOverlay()
    return
  }

  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith("image/")) {
    const dataUrl = await fileToDataUrl(file)
    await analyzeByAI(null, dataUrl, targetGroup)
    hideOverlay()
    return
  }

  const text = event.dataTransfer?.getData("text/plain")?.trim() || event.dataTransfer?.getData("text")?.trim()
  if (text) {
    await analyzeByAI(text, null, targetGroup)
  }
  hideOverlay()
}

async function handleClipboardImage(event) {
  const data = event.clipboardData
  if (!data) return false
  const items = Array.from(data.items || [])
  for (const item of items) {
    const isImageItem = item.type?.startsWith("image/")
    const maybeFile = item.kind === "file"
    if (!isImageItem && !maybeFile) continue
    const file = item.getAsFile()
    if (!file) continue
    if (file.type && !file.type.startsWith("image/")) continue
    event.preventDefault()
    const dataUrl = await fileToDataUrl(file)
    await analyzeByAI(null, dataUrl)
    return true
  }
  return false
}

document.body.addEventListener("dragover", (event) => {
  if (draggingTodoId) return
  if (!isExternalPayload(event.dataTransfer)) return
  event.preventDefault()
  overlay("拖拽到某个项目分组可直接归类", "📥")
})

document.body.addEventListener("dragleave", (event) => {
  if (draggingTodoId) return
  if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
    hideOverlay()
    clearDragOverState()
  }
})

document.body.addEventListener("drop", async (event) => {
  if (draggingTodoId) return
  event.preventDefault()
  clearDragOverState()
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith("image/")) {
    const dataUrl = await fileToDataUrl(file)
    await analyzeByAI(null, dataUrl)
    hideOverlay()
    return
  }
  const text = event.dataTransfer?.getData("text/plain")?.trim() || event.dataTransfer?.getData("text")?.trim()
  if (text) await analyzeByAI(text, null)
  else hideOverlay()
})

calendarBtn.addEventListener("click", () => {
  const isHidden = calendarView.classList.contains("hidden")
  if (isHidden) {
    todoList.classList.add("hidden")
    calendarView.classList.remove("hidden")
    renderCalendar()
    calendarBtn.classList.add("active")
  } else {
    calendarView.classList.add("hidden")
    todoList.classList.remove("hidden")
    calendarBtn.classList.remove("active")
  }
  playCuteSound("tap")
})

prevMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)
  renderCalendar()
  playCuteSound("tap")
})

nextMonthBtn.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)
  renderCalendar()
  playCuteSound("tap")
})

document.addEventListener("paste", async (event) => {
  const pastedImage = await handleClipboardImage(event)
  if (pastedImage) return
  if (document.activeElement === microInput) return
  const text = event.clipboardData?.getData("text/plain")?.trim()
  if (!text) return
  event.preventDefault()
  await analyzeByAI(text, null)
})

microInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return
  const text = microInput.value.trim()
  if (!text) return
  todos.push({ id: id(), content: text, group: null, done: false, remindAt: null, reminded: false })
  microInput.value = ""
  saveTodos()
  renderTodos()
  playCuteSound("tap")
})

captureBtn.addEventListener("click", async () => {
  try {
    const dataUrl = await window.desktopAPI.captureScreen()
    if (!dataUrl) return
    await analyzeByAI(null, dataUrl)
  } catch (error) {
    alert("截图失败，请检查屏幕录制权限")
  }
})

addBtn.addEventListener("click", () => {
  microInput.focus()
})

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0]
  fileInput.value = ""
  if (!file || !file.type.startsWith("image/")) return
  const dataUrl = await fileToDataUrl(file)
  await analyzeByAI(null, dataUrl)
})

closeBtn.addEventListener("click", () => window.desktopAPI.close())
openSettingsBtn.addEventListener("click", () => settingsModal.classList.remove("hidden"))
cancelSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"))
saveSettingsBtn.addEventListener("click", saveSettings)

loadSettings()
loadTodos()
renderTodos()
checkReminders()
setInterval(checkReminders, 30000)
document.addEventListener("pointerdown", unlockAudio, { passive: true })
document.addEventListener("keydown", unlockAudio)
syncAppIcon()
