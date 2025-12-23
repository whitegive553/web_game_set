# 游戏大厅无法交互问题修复说明

## 问题描述

用户报告游戏大厅界面无法选择游戏或创建房间。

## 根本原因

这是一个 **Vite 项目**，但代码中使用了 Create React App 的环境变量约定：

1. **错误的环境变量访问方式**: 使用了 `process.env.REACT_APP_*`
2. **缺少环境变量文件**: `packages/client/.env` 文件不存在
3. **全局样式问题**: `overflow: hidden` 导致页面滚动问题

## 已修复的文件

### 1. 创建环境变量文件
**文件**: `packages/client/.env` (新建)
```env
VITE_API_BASE=http://localhost:3001/api/game
VITE_WS_URL=ws://localhost:3001/ws
VITE_API_URL=http://localhost:3001
```

### 2. 更新环境变量示例
**文件**: `packages/client/.env.example`
- 将 `REACT_APP_WS_URL` 改为 `VITE_WS_URL`
- 将 `REACT_APP_API_URL` 改为 `VITE_API_URL`

### 3. 修复环境变量访问方式
**文件**: `packages/client/src/pages/GameLobby/GameLobby.tsx` (第43行)
```typescript
// 修改前
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws';

// 修改后
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
```

### 4. 添加 TypeScript 类型声明
**文件**: `packages/client/src/vite-env.d.ts` (新建)
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_WS_URL: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 5. 修复全局样式问题
**文件**: `packages/client/src/App.css`

修改前:
```css
html, body {
  overflow: hidden;
  height: 100%;
}

#root {
  height: 100%;
}
```

修改后:
```css
html, body {
  min-height: 100%;
}

#root {
  min-height: 100%;
}
```

### 6. 更新测试文档
**文件**: `GAME_LOBBY_TESTING.md`
- 添加环境变量配置说明
- 添加常见问题排查（无法交互问题）
- 更新启动步骤顺序

## 如何验证修复

### 步骤 1: 停止当前运行的客户端

按 `Ctrl+C` 停止客户端开发服务器

### 步骤 2: 确认文件已更新

```bash
cd packages/client

# 检查 .env 文件是否存在
cat .env

# 应该看到:
# VITE_API_BASE=http://localhost:3001/api/game
# VITE_WS_URL=ws://localhost:3001/ws
# VITE_API_URL=http://localhost:3001
```

### 步骤 3: 清除缓存并重新启动

```bash
# 清除 node_modules/.vite 缓存（可选但推荐）
rm -rf node_modules/.vite

# 重新启动开发服务器
npm run dev
```

### 步骤 4: 测试功能

1. 打开浏览器访问 `http://localhost:5173`
2. 登录账号
3. 进入"多人游戏大厅"
4. **测试游戏选择**: 点击"阿瓦隆"和"文字冒险"卡片，应该能看到选中状态切换
5. **测试创建房间**: 点击"创建房间"按钮，应该弹出模态框
6. **测试 WebSocket**: 打开浏览器开发者工具 → Console，应该能看到 `[Lobby] WebSocket connected`

### 步骤 5: 检查浏览器控制台

打开浏览器开发者工具（F12）:
- **Console 标签**: 不应该有红色错误信息
- **Network 标签**:
  - 应该能看到 `/api/lobby/rooms` 请求
  - 应该能看到 WebSocket 连接（WS 标签）

## Vite vs Create React App 环境变量对比

| 特性 | Create React App | Vite |
|------|------------------|------|
| 环境变量前缀 | `REACT_APP_` | `VITE_` |
| 访问方式 | `process.env.REACT_APP_XXX` | `import.meta.env.VITE_XXX` |
| 类型声明文件 | `react-app-env.d.ts` | `vite-env.d.ts` |
| 重启要求 | 需要 | 需要 |

## 常见错误信息

如果修复不成功，可能会看到以下错误：

### 1. `Cannot read property 'VITE_WS_URL' of undefined`
**原因**: 环境变量文件未生效
**解决**: 重启开发服务器

### 2. `WebSocket connection failed`
**原因**: 服务器未启动或 WebSocket URL 错误
**解决**:
- 确认服务器在运行 (`cd packages/server && npm run dev`)
- 检查 .env 文件中的 `VITE_WS_URL` 配置

### 3. `Failed to fetch rooms`
**原因**: API URL 错误或服务器未响应
**解决**:
- 确认 .env 文件中的 `VITE_API_URL` 配置
- 检查服务器日志

## 总结

这个问题的核心是 **环境变量配置不匹配**。Vite 项目必须使用 `VITE_` 前缀和 `import.meta.env` 访问方式。修复后，所有游戏大厅功能应该正常工作。

**重要**: 修改环境变量后，必须重启开发服务器才能生效！
