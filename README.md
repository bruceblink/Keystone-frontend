<p align="center">
      <img src="https://img.shields.io/badge/Release-V2.0.0-green.svg" alt="Downloads">
      <img src="https://img.shields.io/badge/Node.js-16.0+-green.svg" alt="Build Status">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Build Status">
   <img src="https://img.shields.io/badge/Vue-3.5-blue.svg" alt="Downloads">
   <a target="_blank" href="https://likanug.top">
   <img src="https://img.shields.io/badge/Author-likanug-ff69b4.svg" alt="Downloads">
 </a>
 <a target="_blank" href="https://likanug.top">
   <img src="https://img.shields.io/badge/Copyright%20-@Agileboot-%23ff3f59.svg" alt="Downloads">
 </a>
 </p>
<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">AgileBoot v2.0.0</h1>

<h4 align="center">基于SpringBoot+Vue3前后端分离的Java快速开发框架</h4>

## ⚡ 平台简介 ⚡

AgileBoot 是一套开源的全栈精简快速开发平台，毫无保留给个人及企业免费使用。本项目的目标是做一款精简可靠，代码风格优良，项目规范的小型开发脚手架。

• 本仓库是 Agileboot 快速开发脚手架的配套前端项目。前端是基于优秀的开源项目[AgileBoot-Front-End](https://github.com/valarchie/AgileBoot-Front-End)开发而成。在此感谢[作者](https://github.com/valarchie)。
• 配套后端代码仓库地址[AgileBoot-Back-End](https://github.com/bruceblink/AgileBoot-Back-End)。
• 前端采用 Vue3、Element Plus、TypeScript、Pinia 等现代化技术栈。

## 💥 在线体验 💥

演示地址：<https://agileboot-front-end.pages.dev>

## 🌴 项目背景 🌴

- 适合个人开发者的小型项目或者公司内部项目使用。也可作为供初学者学习使用的案例。
- 有任何问题或者建议，可以在 Issues 中提给作者。**您的 Issue 比 Star 更重要**
- 如果觉得项目对您有帮助，可以来个 Star ⭐

## ✨ 使用 ✨

### 开发环境

• Node.js 16.0+
• pnpm 6.0+

> 优先选择 node=16, pnpm=7.30.5 的环境

### 技术栈

| 技术             | 说明                   | 版本  |
| ---------------- | ---------------------- | ----- |
| Vue              | 渐进式 JavaScript 框架 | 3.5+  |
| Element Plus     | Vue 3 的 UI 元件库     | 2.13+ |
| Vite             | 下一代前端构建工具     | 5.4+  |
| TypeScript       | JavaScript 的超集      | 5.0+  |
| Pinia            | Vue 3 状态管理         | 2.1+  |
| Vue Router       | Vue 3 的官方路由       | 4.2+  |
| Axios            | HTTP 客户端            | 1.15+ |
| @pureadmin/table | 纯管理表格组件库       | 2.3+  |
| Element Icons    | Element 图标库         | 2.1+  |

### 快速开始

#### 1. 安装 pnpm

如果您还没安装 pnpm，请执行下面命令进行安装（mac 用户遇到安装报错请在命令前加上 sudo）

```bash
npm install -g pnpm
```

#### 2. 配置 npm 源（可选）

```bash
npm config set registry https://registry.npmmirror.com
```

#### 3. 安装依赖

```bash
pnpm install
```

#### 4. 启动开发环境

```bash
pnpm run dev
```

#### 5. 构建生产版本

```bash
pnpm run build
```

### 常用命令

| 命令                     | 说明                |
| ------------------------ | ------------------- |
| `pnpm install`           | 安装依赖            |
| `pnpm add <package>`     | 安装一个包          |
| `pnpm remove <package>`  | 卸载一个包          |
| `pnpm run dev`           | 启动开发服务器      |
| `pnpm run build`         | 生产构建            |
| `pnpm run typecheck`     | 类型检查            |
| `pnpm run lint:eslint`   | ESLint 代码检查     |
| `pnpm run lint:prettier` | Prettier 代码格式化 |

## 🙊 系统内置功能 🙊

🙂 大部分功能，均有通过 **单元测试** **集成测试** 保证质量。

|     | 功能       | 描述                                                          |
| --- | ---------- | ------------------------------------------------------------- |
|     | 用户管理   | 用户是系统操作者，该功能主要完成系统用户配置                  |
| ⭐  | 部门管理   | 配置系统组织机构（公司、部门、小组），树结构展现支持数据权限  |
| ⭐  | 岗位管理   | 配置系统用户所属担任职务                                      |
|     | 菜单管理   | 配置系统菜单、操作权限、按钮权限标识等，本地缓存提供性能      |
| ⭐  | 角色管理   | 角色菜单权限分配、设置角色按机构进行数据范围权限划分          |
|     | 参数管理   | 对系统动态配置常用参数                                        |
|     | 通知公告   | 系统通知公告信息发布维护                                      |
| 🚀  | 操作日志   | 系统正常操作日志记录和查询；系统异常信息日志记录和查询        |
|     | 登录日志   | 系统登录日志记录查询包含登录异常                              |
|     | 在线用户   | 当前系统中活跃用户状态监控                                    |
|     | 系统接口   | 根据业务代码自动生成相关的 api 接口文档                       |
|     | 服务监控   | 监视当前系统 CPU、内存、磁盘、堆栈等相关信息                  |
|     | 缓存监控   | 对系统的缓存信息查询，命令统计等                              |
|     | 连接池监视 | 监视当前系统数据库连接池状态，可进行分析 SQL 找出系统性能瓶颈 |

## 🐯 工程结构 🐯

```
AgileBoot-Front-End
├── build/                    # Vite 构建脚本
├── dist/                     # 生产构建输出
├── mock/                     # 模拟数据
├── public/                   # 公共资源
├── src/
│   ├── api/                  # API 接口封装
│   ├── assets/               # 静态资源（图片、SVG、字体等）
│   ├── components/           # 公共组件
│   ├── config/               # 项目配置
│   ├── directives/           # 自定义指令
│   ├── layout/               # 布局组件
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
├── package.json              # 项目依赖配置
├── pnpm-lock.yaml            # 依赖锁定文件
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── README.md                 # 项目说明
```

### 代码规范

- **编码风格**: 采用 Google 代码风格规范
- **类型检查**: 使用 TypeScript 进行严格的类型检查
- **代码格式化**: Prettier 自动格式化代码
- **代码检查**: ESLint 进行代码质量检查
- **样式检查**: Stylelint 进行样式规范检查

## 🌻 注意事项 🌻

• **编辑器配置**: 请在 VS Code 中安装 Volar 插件以获得最好的 Vue 3 + TypeScript 支持
• **代码格式化**: 项目集成了 Prettier，建议开启 Format on Save
• **开发工具**: 建议使用 [Vue DevTools](https://devtools.vuejs.org/) 进行调试
• **国内源配置**: 如遇网络问题，可配置国内镜像源：

```bash
npm config set registry https://registry.npmmirror.com
```

• **环境变量**: 项目使用 `.env` 文件管理环境变量，请根据实际情况配置
• **API 代理**: 开发环境配置了 `/dev-api` 代理指向后端服务，详见 `vite.config.ts`
• **浏览器兼容**: 项目已去除 IE 11 支持，请使用现代浏览器访问

## 📚 更多资源 📚

• [Vue 3 官方文档](https://v3.cn.vuejs.org/)
• [Element Plus 文档](https://element-plus.org/zh-CN/)
• [Vite 中文文档](https://cn.vitejs.dev/)
• [TypeScript 文档](https://www.typescriptlang.org/zh/)
• [Pinia 文档](https://pinia.vuejs.org/zh/)
• [AgileBoot 全栈项目详细教程](https://juejin.cn/post/7153812187834744845)

### 许可证

原则上不收取任何费用及版权，可商用，不过如需二次开源（比如用此平台二次开发并开源，要求前端代码必须开源免费）请联系作者获取许可！

## Contributors

<a href="https://github.com/bruceblink/AgileBoot-Front-End/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bruceblink/AgileBoot-Front-End" alt="bruceblink/AgileBoot-Front-End"/>
</a>

## 支持项目

如果觉得项目对您有帮助，可以来个 Star ⭐

[![Sponsor](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/bruceblink) [![Buy Me Coffee](https://img.shields.io/badge/Buy%20Me%20Coffee-FF5A5F?style=for-the-badge&logo=coffee&logoColor=FFFFFF)](https://buymeacoffee.com/bruceblink)
