# 项目上下文

## 技术栈

- **核心**: Vite 7, TypeScript, Express
- **UI**: Tailwind CSS

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── index.css       # 全局样式
│   ├── index.ts        # 客户端入口
│   └── main.ts         # 主逻辑
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 Tailwind CSS 进行样式开发

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、Express `req`/`res`、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

## 项目功能说明

### 蓝牙鼠标信息转换器

这是一个将 Windows 11 蓝牙鼠标注册表信息转换为 Ubuntu BlueZ 格式的工具。

**核心文件**：
- `src/bluetooth-converter.ts` - 核心转换逻辑
- `src/main.ts` - UI 渲染和事件处理

**主要功能**：
1. 解析 Windows 注册表格式的蓝牙设备信息
2. 提取设备名称、蓝牙地址、链接密钥等
3. 生成符合 Ubuntu BlueZ 规范的 info 文件
4. 支持复制和下载转换结果

**使用方式**：
- 在 Windows 中导出蓝牙设备的注册表信息
- 粘贴到网页左侧输入框
- 点击"解析"按钮生成 Ubuntu 格式的 info 文件
