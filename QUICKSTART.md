# Lumo — 开发快速入门

## 环境要求

| 工具 | 最低版本 | 安装方式 |
|------|---------|---------|
| Node.js | >= 24.12 | [nodejs.org](https://nodejs.org/) |
| pnpm | >= 10.26 | `npm install -g pnpm` |
| Rust (stable) | >= 1.77.2 | [rustup.rs](https://rustup.rs/) |
| typeshare-cli | latest | `cargo install typeshare-cli` |
| Tauri 平台依赖 | — | [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/) |

## 首次启动

```bash
# 1. 安装前端依赖
pnpm install

# 2. 编译 daemon（首次必须，后续 daemon 代码变更后也需要重新编译）
cargo build -p lumo-daemon

# 3. 启动开发环境（会自动生成 TypeScript 类型 + 启动前端 dev server + 启动 Tauri 应用）
pnpm tauri:dev
```

> **注意**：`pnpm tauri:dev` 会自动运行 `pnpm generate-types`（Rust → TypeScript 类型生成）和 `pnpm dev`（Next.js dev server），但**不会**自动编译 daemon。首次或 daemon 代码变更后需要手动执行 `cargo build -p lumo-daemon`。

## 日常开发

### 全栈开发（推荐）

```bash
pnpm tauri:dev    # 启动 Tauri 应用 + 前端 dev server
```

### 仅前端

```bash
pnpm dev          # Next.js dev server (localhost:3000)
pnpm build        # 构建静态站点到 packages/ui/out/
pnpm lint         # Biome 代码检查
pnpm check        # Biome 代码检查 + 格式化（自动修复）
```

### 仅 Rust

```bash
cargo check                      # 检查所有 crate
cargo check -p app               # 检查 Tauri 应用（包名是 "app"）
cargo check -p lumo-daemon       # 检查 daemon
cargo check -p shared            # 检查共享库
cargo run -p lumo-daemon         # 直接运行 daemon
```

### 类型生成

```bash
pnpm generate-types   # 从 Rust #[typeshare] 结构体生成 TypeScript 类型
```

修改了 `src-tauri/src/types/` 中的 `#[typeshare]` 结构体后需要重新生成。`pnpm tauri:dev` 启动时会自动运行。

## 何时需要重新编译 Daemon

Daemon 是独立的 HTTP 服务，通过 Tauri 应用管理其生命周期。以下情况需要重新编译：

```bash
cargo build -p lumo-daemon
```

- 修改了 `crates/daemon/` 下的代码
- 修改了 `crates/shared/` 下的代码（daemon 和 Tauri app 共用）
- 修改了 `crates/shared/migrations/` 中的数据库迁移

> `pnpm tauri build`（生产构建）会自动编译 daemon，但 `pnpm tauri:dev`（开发模式）不会。

## 项目结构概览

```
lumo/
├── packages/ui/          # Next.js 前端（SSG 模式）
├── crates/
│   ├── daemon/           # OTLP 遥测接收服务（Axum HTTP）
│   └── shared/           # 共享库（数据库实体、仓库、迁移）
├── src-tauri/            # Tauri 桌面应用（命令、服务、类型）
└── scripts/              # 构建和安装脚本
```

详细架构说明见 [CLAUDE.md](CLAUDE.md)。
