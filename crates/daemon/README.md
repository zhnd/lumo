# Lumo Daemon

独立的后台 HTTP 服务，接收 Claude Code 的 OTLP 遥测数据和 Hook 事件，持久化到 SQLite。

## 功能

- 接收 OTLP/HTTP JSON 格式的 metrics 和 logs 数据
- 接收 Claude Code hook 通知（session 开始/结束、tool 使用等）
- 数据持久化到 SQLite（`~/.lumo/lumo.db`）
- macOS launchd 自动启动，由 Tauri 应用管理生命周期

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/v1/metrics` | 接收 OTLP metrics（protobuf JSON） |
| POST | `/v1/logs` | 接收 OTLP logs/events（protobuf JSON） |
| POST | `/notify` | 接收 Claude Code hook 通知 |

## 开发

```bash
cargo run -p lumo-daemon                    # 运行 daemon
RUST_LOG=debug cargo run -p lumo-daemon     # debug 日志级别
cargo build -p lumo-daemon                  # 编译（dev 模式）
cargo build -p lumo-daemon --release        # 编译（release 模式）
```

## 配置

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LUMO_HOST` | `127.0.0.1` | 监听地址 |
| `LUMO_PORT` | `4318` | 监听端口 |
| `RUST_LOG` | `info` | 日志级别 |

## 生命周期管理

Daemon 由 Tauri 应用的 `DaemonManager` 管理（`src-tauri/src/daemon/`）：

1. 二进制文件打包在 Tauri 应用资源中
2. 首次启动时安装到 `~/.lumo/bin/lumo-daemon`
3. 注册为 macOS `launchd` agent（`com.zhnd.lumo-daemon`）
4. 每次应用启动时通过 `GET /health` 健康检查

开发时需要手动编译 daemon：`cargo build -p lumo-daemon`。`pnpm tauri:dev` 不会自动编译 daemon，但 `pnpm tauri build` 会。

## 架构

详细的代码结构和开发指南见 [CLAUDE.md](CLAUDE.md)。
