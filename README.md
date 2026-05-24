<p align="center">
  <h1 align="center">Coding Agent</h1>
  <p align="center">
    AI 驱动的桌面端编程助手，支持文件操作、命令执行、Git 管理等工具调用。
    <br />
    个人学习项目，用于探索 Coding Agent 的架构与实现。
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
</p>

---

## 特性

- **AI 代理循环**：流式对话 → 工具调用 → 结果反馈 → 自动迭代，直至任务完成
- **多工具支持**：文件读写、搜索（glob / grep）、Shell 命令执行、Git 操作
- **流式响应**：实时显示 AI 推理过程（reasoning）与输出 token
- **权限控制**：分级权限模型（always / ask / deny），支持信任模式一键放行
- **项目 & 对话管理**：多项目管理、对话分组、导出导入、撤销回退
- **上下文压缩**：超长对话自动摘要压缩，避免超出 token 限制
- **命令系统**：内置 `/config` 命令 + 自定义 `COMMAND.md` 扩展
- **技能系统**：`#skillname` 激活预设技能，持久注入系统提示
- **暗色 / 亮色主题**：跟随偏好切换

---

## 技术栈

| 层            | 技术                                   |
| ------------- | -------------------------------------- |
| 桌面框架      | Electron 33                            |
| 前端框架      | Vue 3.5 + Pinia 2.3                    |
| 构建工具      | Vite 6 + TypeScript 5.7                |
| 数据库        | better-sqlite3（WAL 模式）             |
| Markdown 渲染 | marked                                 |
| HTTP 客户端   | fetch（Node 20 内置）                  |
| 配置解析      | smol-toml                              |
| 代码质量      | ESLint 10 + Prettier 3 + vue-tsc       |
| 打包分发      | electron-builder（NSIS）               |
| AI 接口       | OpenAI-compatible API（默认 DeepSeek） |
| 原生重建      | electron-rebuild                       |

---

## 目录结构

```
coding-agent/
├── electron/                        # Electron 主进程
│   ├── main.ts                      # 入口：创建窗口、注册 IPC、生命周期管理
│   ├── preload.ts                   # IPC 桥接：contextBridge 暴露 window.api
│   ├── api/                         # OpenAI 兼容客户端（流式 / 非流式）
│   ├── db/                          # SQLite 数据层（项目 / 对话 / 消息 / 撤销）
│   ├── services/                    # 业务逻辑层
│   │   ├── agent-loop.ts            # Agent 循环状态机
│   │   ├── agent-service.ts         # Agent 公共 API
│   │   ├── agent-shared.ts          # Agent 共享类型与常量
│   │   ├── agent-context.ts         # 上下文构建
│   │   ├── chat-service.ts          # 消息发送编排
│   │   ├── conversation-service.ts  # 对话 CRUD + 导入导出
│   │   ├── conversation-runtime.ts  # 对话运行时容器（内存状态）
│   │   ├── conversation-registry.ts # 对话运行时注册表
│   │   ├── project-service.ts       # 项目管理
│   │   ├── command-service.ts       # 命令解析与执行
│   │   ├── file-service.ts          # 文件搜索
│   │   ├── undo-service.ts          # 文件撤销
│   │   └── skill-service.ts         # 技能管理
│   ├── tools/                       # 工具实现层
│   │   ├── registry.ts              # 工具注册与路由
│   │   ├── file-tools.ts            # 文件操作工具
│   │   ├── command-tools.ts         # 命令执行工具
│   │   └── git-tools.ts             # Git 操作工具
│   ├── ipc/                         # IPC 通道注册
│   └── utils/                       # 工具函数（配置读取 / 上下文构建 / 窗口状态）
├── src/                             # Vue 3 渲染进程
│   ├── App.vue                      # 根组件
│   ├── main.ts                      # Vue 入口
│   ├── components/
│   │   ├── chat/                    # 聊天窗口、消息列表、消息气泡、输入框、工具调用卡片
│   │   ├── sidebar/                 # 项目列表、对话列表
│   │   ├── layout/                  # 布局容器、错误边界、主题切换、拖拽手柄
│   │   ├── modals/                  # 权限确认弹窗
│   │   ├── diff/                    # Diff 查看器
│   │   └── dev/                     # 开发调试面板
│   ├── stores/                      # Pinia 状态管理（project / conversation / chat / theme / layout / trustMode）
│   ├── composables/                 # 组合式函数（useAgent / useFileSearch / useResizable）
│   ├── types/                       # 前端类型定义
│   └── styles/                      # 主题 CSS
├── shared/                          # 主进程 & 渲染进程共享
│   └── types.ts                     # 核心类型定义 + IPC 通道枚举
├── docs/                            # 文档
│   ├── architecture.md              # 架构设计文档
│   └── TODO.md                      # 打磨清单
├── openspec/                        # OpenSpec 规格文档（16 个能力规格）
├── resources/                       # 应用图标等静态资源
├── .vscode/                         # VS Code 配置
├── index.html                       # HTML 入口
├── package.json
├── vite.config.ts
├── tsconfig.json / .node / .web
└── electron-builder.json5           # 打包配置
```

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **Windows** / **macOS** / **Linux**
- **Git**（可选，用于 Git 工具）

### 安装

```bash
git clone <your-repo-url>
cd coding-agent

# 安装依赖（会自动执行 electron-rebuild 编译 better-sqlite3）
npm install
```

### 配置

在项目根目录创建 `.agents/config.toml`（应用首次运行 `/config` 命令也可自动生成）：

```toml
[api]
base_url = "https://api.deepseek.com/v1"
api_key = "env:DEEPSEEK_API_KEY"   # 或直接填写 API Key
model = "deepseek-chat"
retry = 3

[permissions]
read = "always"
write = "ask"
execute = "ask"

[agent]
max_turns = 50
```

`api_key` 支持 `env:` 前缀引用环境变量，建议使用环境变量避免泄漏密钥。

### 开发运行

```bash
npm run dev
```

启动后，Vite 开发服务器 + Electron 窗口自动打开，支持热更新。

### 构建打包

```bash
# 全平台构建
npm run build

# 仅 Windows
npm run build:win

# 仅构建渲染进程（不打包）
npm run build:renderer
```

打包产物输出到 `release/` 目录。

### 可用命令

| 命令                     | 说明                   |
| ------------------------ | ---------------------- |
| `npm run dev`            | 启动开发服务器         |
| `npm run build`          | 类型检查 + 构建 + 打包 |
| `npm run build:renderer` | 仅构建渲染进程         |
| `npm run build:win`      | 构建 Windows 安装包    |
| `npm run preview`        | 预览构建结果           |
| `npm run typecheck`      | TypeScript 类型检查    |
| `npm run lint`           | 代码检查               |
| `npm run lint:fix`       | 自动修复 Lint 问题     |
| `npm run format`         | 代码格式化             |
| `npm run format:check`   | 检查代码格式           |

---

## 架构概览

```
+-------------------------------------------------------------------------------+
|                                   Electron                                    |
|                                                                               |
|  +-----------------------------------+        +----------------------------+  |
|  |           Main Process            |        |      Renderer Process      |  |
|  |                                   |        |                            |  |
|  |  +-----------------------------+  |        |  +----------------------+  |  |
|  |  |        IPC Handlers         |<------------>|      window.api      |  |  |
|  |  +-------------+---------------+  |        |  +----------+-----------+  |  |
|  |                |                  |        |             |              |  |
|  |                v                  |        |             v              |  |
|  |  +-----------------------------+  |        |  +----------------------+  |  |
|  |  |        Service Layer        |  |        |  |     Pinia Stores     |  |  |
|  |  | agent / chat / conversation |  |        |  | project / conv       |  |  |
|  |  | project / ...               |  |        |  | chat / theme / ...   |  |  |
|  |  +------+------+---------------+  |        |  +----------+-----------+  |  |
|  |         |      |                  |        |             |              |  |
|  |         |      |                  |        |             v              |  |
|  |         v      v                  |        |  +----------------------+  |  |
|  |  +---------+  +----------------+  |        |  |    Vue Components    |  |  |
|  |  | DB SQL  |  | Tools Registry |  |        |  | ChatWindow           |  |  |
|  |  +---------+  +----------------+  |        |  | MessageList          |  |  |
|  |                                   |        |  | DiffViewer / ...     |  |  |
|  |                |                  |        |  +----------------------+  |  |
|  |                v                  |        |                            |  |
|  |  +-----------------------------+  |        +----------------------------+  |
|  |  |        DeepSeek API         |  |                                        |
|  |  |   OpenAI-compatible API     |  |                                        |
|  |  +-----------------------------+  |                                        |
|  |                                   |                                        |
|  +-----------------------------------+                                        |
|                                                                               |
+-------------------------------------------------------------------------------+

```

**核心数据流**：用户输入 → `chat:send` IPC → ChatService 解析命令/文件/技能引用 → AgentLoop 启动 → 流式 API 调用 → 工具执行 → 结果反馈 → 循环直至完成或超限。

详见 [docs/architecture.md](docs/architecture.md)。

---

## 使用示例

### 基本对话

```
帮我创建一个 Express 后端项目，包含用户注册和登录接口
```

AI 会自动执行 `mkdir`、`npm init`、创建文件、安装依赖等操作。

### 文件引用

```
@index.ts 这个文件里的路由有什么问题？帮我优化一下
```

输入 `@` 触发文件搜索，选择目标文件后发送。

### 技能激活

```
#frontend-design 帮我设计一个登录页面
```

输入 `#` 触发技能搜索，选择后技能会注入到后续对话中。

### 自定义命令

在 `.agents/commands/git-commit/COMMAND.md` 中定义命令：

```markdown
# Git Commit

根据当前 git diff 内容，生成符合 conventional commits 规范的提交信息并执行 commit。
```

使用 `/git-commit` 即可触发。

---

## 项目状态

项目处于早期开发阶段，核心 Agent 循环已可用。待完善功能详见 [docs/TODO.md](docs/TODO.md)。

---

## License

MIT
