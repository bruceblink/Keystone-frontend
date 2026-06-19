<p align="center">
  <img src="https://img.shields.io/badge/Release-V3.6.1-green.svg" alt="Release">
  <img src="https://img.shields.io/badge/Node.js-18%2B-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Vue-3.5-blue.svg" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-5.4-blue.svg" alt="Vite">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
</p>

<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">Keystone Frontend</h1>

<h4 align="center">Keystone 后台管理系统前端，基于 Vue 3 + Vite + TypeScript + Element Plus。</h4>

## 项目定位

本仓库是 [Keystone](https://github.com/bruceblink/Keystone) 的配套前端项目，面向用户、角色、菜单、部门、岗位、字典、配置、公告、日志、在线用户、服务监控、缓存监控和定时任务等后台管理场景。

Keystone 后端当前版本为 `3.6.1`，默认服务端口为 `18080`，默认本地 profile 为 `dev`。前端开发环境通过 Vite 代理访问后端，业务接口保持后端根路径风格，例如 `/login`、`/refresh-token`、`/getConfig` 和 `/system/jobs`。

## 技术栈

| 技术             | 用途        | 版本  |
| ---------------- | ----------- | ----- |
| Vue              | 前端框架    | 3.5+  |
| Vite             | 构建工具    | 5.4+  |
| TypeScript       | 类型系统    | 5.0+  |
| Element Plus     | UI 组件库   | 2.14+ |
| Pinia            | 状态管理    | 2.3+  |
| Vue Router       | 路由        | 4.6+  |
| Axios            | HTTP 客户端 | 1.17+ |
| @pureadmin/table | 表格组件    | 2.4+  |

## 环境要求

- Node.js 18+，建议使用当前 LTS 版本。
- pnpm 10+，仓库使用 `pnpm-lock.yaml` 锁定依赖。
- 本地联调需要 Keystone 后端运行在 `http://localhost:18080`。

## 快速开始

### 1. 启动 Keystone 后端

后端仓库默认位于同级目录 `../Keystone`。本地开发通常先启动 MySQL 和 Redis，再用 IDE 或 Gradle 启动 `app.keystone.admin.KeystoneAdminApplication`。

```bash
cd ../Keystone/docker
docker compose up -d mysql redis
```

后端本地默认配置：

| 项       | 默认值                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| 后端地址 | `http://localhost:18080`                                                        |
| MySQL    | `localhost:33066` / DB: `keystone` / User: `root` / Pass: encrypted secret file |
| Redis    | `localhost:6379` / Pass: `12345`                                                |
| Profile  | `dev`                                                                           |

### 2. 安装前端依赖

```bash
pnpm install
```

首次安装如果 pnpm 提示 `approve-builds`，按本机安全策略确认依赖构建脚本即可。

### 3. 启动前端

```bash
pnpm dev
```

默认端口为 `8848`，访问 `http://localhost:8848`。

### 4. 构建生产版本

```bash
pnpm build
```

构建产物输出到 `dist/`。

## 前后端接口约定

开发环境 Vite 代理规则在 [vite.config.mts](vite.config.mts) 中维护：

| 前端路径           | 代理目标                                 | 说明                             |
| ------------------ | ---------------------------------------- | -------------------------------- |
| `/api/*`           | `http://localhost:18080/*`               | 业务 API，代理时去掉 `/api` 前缀 |
| `/v3/*`            | `http://localhost:18080/v3/*`            | OpenAPI JSON                     |
| `/swagger-ui/*`    | `http://localhost:18080/swagger-ui/*`    | Swagger UI                       |
| `/swagger-ui.html` | `http://localhost:18080/swagger-ui.html` | Swagger UI 兼容入口              |

当前登录相关接口：

| 接口                         | 用途                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `GET /getConfig`             | 登录页配置和字典数据                                        |
| `GET /captchaImage`          | 验证码                                                      |
| `GET /login/rsa-public-key`  | 获取 RSA 公钥，用于登录密码加密                             |
| `POST /login`                | 统一登录入口，按后端 auth mode 选择 local 或 Keylo 凭证认证 |
| `POST /refresh-token`        | 刷新 Keystone access token                                  |
| `POST /logout-refresh-token` | access token 失效后释放 refresh 会话                        |
| `POST /logout`               | 退出当前登录                                                |

`/api/getConfig` 在开发模式下有本地兜底响应：后端未启动时会返回关闭验证码、空字典的最小配置，方便打开登录页；真实联调仍应以后端 `/getConfig` 为准。

## 常用命令

| 命令                                             | 说明                       |
| ------------------------------------------------ | -------------------------- |
| `pnpm install`                                   | 安装依赖                   |
| `pnpm dev`                                       | 启动开发服务器             |
| `pnpm build`                                     | 生产构建                   |
| `pnpm typecheck`                                 | TypeScript 和 Vue 类型检查 |
| `pnpm exec eslint "src/**/*.{js,ts,tsx,vue}"`    | 只检查 ESLint，不自动改写  |
| `pnpm exec stylelint "**/*.{html,vue,css,scss}"` | 只检查样式，不自动改写     |
| `pnpm lint:eslint`                               | ESLint 检查并自动修复      |
| `pnpm lint:prettier`                             | Prettier 格式化            |
| `pnpm lint:stylelint`                            | Stylelint 检查并自动修复   |

## 内置功能

| 功能     | 描述                                       |
| -------- | ------------------------------------------ |
| 用户管理 | 系统用户配置、状态维护、重置密码           |
| 部门管理 | 组织机构树维护                             |
| 岗位管理 | 用户岗位维护                               |
| 菜单管理 | 菜单、路由、按钮权限标识维护               |
| 角色管理 | 角色菜单权限和数据范围配置                 |
| 字典管理 | 字典类型和字典数据维护，对齐后端 DB 字典源 |
| 参数管理 | 系统动态配置维护                           |
| 通知公告 | 系统通知公告发布维护                       |
| 定时任务 | 后端调度任务、执行状态和日志管理           |
| 操作日志 | 系统操作日志查询                           |
| 登录日志 | 登录记录和异常查询                         |
| 在线用户 | 当前活跃用户状态监控                       |
| 服务监控 | CPU、内存、磁盘、JVM 等服务信息            |
| 缓存监控 | Redis 缓存信息和命令统计                   |

## 工程结构

```text
Keystone-frontend
├── build/                    # Vite 构建脚本
├── mock/                     # Mock 数据
├── public/                   # 公共资源和 serverConfig.json
├── src/
│   ├── api/                  # API 接口封装
│   ├── assets/               # 静态资源
│   ├── components/           # 公共组件
│   ├── config/               # 运行时配置加载
│   ├── directives/           # 自定义指令
│   ├── layout/               # 后台布局
│   ├── plugins/              # Vue 插件
│   ├── router/               # 路由配置
│   ├── store/                # Pinia 状态管理
│   ├── style/                # 全局样式
│   ├── utils/                # 工具函数
│   ├── views/                # 页面组件
│   ├── App.vue               # 根组件
│   └── main.ts               # 应用入口
├── types/                    # TypeScript 类型定义
├── index.html                # HTML 模板
├── package.json              # 项目依赖和脚本
├── pnpm-lock.yaml            # 依赖锁定文件
├── tsconfig.json             # TypeScript 配置
├── vite.config.mts           # Vite 配置
└── README.md                 # 项目说明
```

## 开发注意事项

- `public/serverConfig.json` 维护前端运行时标题、布局、主题等配置。
- 登录页配置和系统字典来自后端 `/getConfig`，后端字典源为 `sys_dict_type` / `sys_dict_data`。
- Keystone token 和 refresh token 由后端签发，前端在 token 失效时调用 `/refresh-token`。
- 同一账号默认只允许一个在线会话；登录冲突时前端可带 `forceLogin=true` 接管旧会话。
- Swagger UI 可通过 `http://localhost:8848/swagger-ui/index.html` 走开发代理访问，是否可用取决于后端当前环境配置。

## 相关文档

- 后端仓库：[Keystone](https://github.com/bruceblink/Keystone)
- 后端完整工程文档：`../Keystone/docs/项目说明.md`
- refresh token 设计：`../Keystone/docs/refresh-token-session-design.md`
- 定时任务设计：`../Keystone/docs/scheduled-job-design.md`

## 许可证

本项目基于 MIT License 发布。二次开发和开源分发时请同时遵守上游依赖和原始模板项目的许可要求。
