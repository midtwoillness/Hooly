# Hooly

<div align="center">
  <img src="src/renderer/app-icon.svg" width="120" height="120" alt="Hooly Icon" />
  <h3>Hooly</h3>
  <p>你的智能桌面助手 · 懂你所想 · 井井有条</p>
</div>

---

Hooly 是一款基于 Electron 构建的现代化智能桌面待办应用。它不仅是一个颜值超高的待办清单，更是一个拥有 AI 大脑的个人助理。它能听懂你的话，看懂你的图，自动帮你整理任务、规划日程，并提供贴心的提醒服务。

## 📸 应用截图

### 主界面
<div align="center">
  <img src="./screenshot1.png" alt="主界面" width="339" />
  <p><i>简洁的主界面，轻松管理所有任务</i></p>
</div>

### 功能展示
<div align="center">
  <img src="./screenshot2.png" alt="功能展示" width="339" />
  <p><i>智能任务识别与分类</i></p>
</div>

## ✨ 核心特性

- **🤖 智能分析**：
  - 支持自然语言输入，AI 自动提炼待办事项。
  - 支持 **截图/图片拖拽**，AI 识别图片内容（如会议板书、聊天记录）并生成任务。
  - **智能分类**：根据你的历史习惯，自动将任务归类到对应的项目（如"装修"、"Q3述职"）。
  
- **📅 强大的日程管理**：
  - **日历视图**：iOS 风格的月视图交互，点击日期即可查看当日安排。
  - **日期区间**：支持为任务设置开始和结束日期。
  - **精准提醒**：支持设置具体的提醒时间，到点自动推送系统通知。

- **🎨 极致的 UI/UX**：
  - **悬浮球模式**：平时化身可爱的桌面悬浮球，不打扰工作；需要时一键展开。
  - **萌趣音效**：内置"奶呼呼"、"像素风"、"果冻泡泡"等多套解压音效。
  - **细节打磨**：毛玻璃特效、丝滑动画、防止误触的交互设计。

## 🛠️ 技术栈

- **框架**：Electron + Node.js
- **前端**：原生 HTML/CSS/JS (无重型框架依赖，轻量高效)
- **AI 能力**：OpenAI 接口兼容 (支持 GPT-4o 等模型)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发模式

```bash
npm start
```

### 3. 构建应用

```bash
# 构建 macOS 应用 (DMG)
npm run pack:mac

# 构建 Windows 应用 (NSIS)
npm run pack:win

# 构建 Linux 应用 (AppImage)
npm run pack:linux
```

## ⚙️ 配置说明

首次启动应用时，你需要进行简单的设置：
1. **API 配置**：输入 OpenAI 兼容的 Base URL 和 API Key。
2. **个人画像**：告诉 Hooly 你的昵称、职业和当前关注重心，这能让 AI 的建议更精准。
3. **偏好设置**：选择你喜欢的音效主题和音量。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！如果你有好的点子，请随时告诉我们。

---

<div align="center">
  Made with ❤️ by Hooly Team
</div>
