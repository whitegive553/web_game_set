# WebSocket JWT 验证问题修复

## 🐛 问题

用户报告 WebSocket 不断重连，控制台一直打印：
```
[WS] Connection closed {code: 1008, reason: 'Invalid token', wasClean: true}
[WS] Attempting reconnect 1/5
```

## 🔍 根本原因

**JWT_SECRET 不一致**！

### 问题代码

**`auth-service.ts`** (生成 token):
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
```

**`websocket-service.ts`** (验证 token):
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

### 导致的问题

1. 用户登录时，**auth-service** 使用密钥 A 生成 token
2. WebSocket 连接时，**websocket-service** 使用密钥 B 验证 token
3. 密钥不匹配，验证失败，返回 code 1008
4. 客户端不断重连（因为以为是网络问题）
5. 每次重连都失败（因为 token 本身就无法验证）

## ✅ 修复方案

### 1. 统一 JWT_SECRET

**文件**: `packages/server/src/services/websocket-service.ts`

**修改前**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**修改后**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
```

### 2. 阻止认证失败的重连

**文件**: `packages/client/src/services/websocket-client.ts`

**新增逻辑**:
```typescript
this.ws.onclose = (event) => {
  // Don't reconnect for authentication errors (code 1008)
  if (event.code === 1008) {
    console.error('[WS] Authentication failed - will not retry. Please check your login status.');
    this.emit('auth_failed', { code: event.code, reason: event.reason });
    return; // ✅ 不再重连
  }

  // 其他错误才重连
  if (!this.isIntentionallyClosed) {
    this.attemptReconnect();
  }
};
```

**好处**:
- ✅ 认证错误时不再无限重连
- ✅ 控制台不再刷屏
- ✅ 明确告诉用户是认证问题

## 🧪 测试步骤

### 1. 重启服务器

**重要！必须重启服务器才能加载新的代码！**

```bash
cd packages/server
# Ctrl+C 停止
npm run dev
```

### 2. 重启客户端

```bash
cd packages/client
# Ctrl+C 停止
npm run dev
```

### 3. 清除浏览器缓存并重新登录

```
Ctrl+Shift+Delete → 清除缓存
或
Ctrl+Shift+R → 强制刷新
```

**重要**: 需要重新登录以获取新的 token！

### 4. 进入游戏大厅

登录后，点击"多人游戏大厅"。

### 5. 查看控制台

**成功连接**（预期）:
```
[GameLobby] Attempting WebSocket connection: ws://localhost:3001/ws
[WS] Connected to server
[Lobby] ✅ WebSocket connected (real-time updates enabled)
```

**不再有频繁的重连！**

## 📊 对比

### 修复前

```
[WS] Connected to server
[WS] Connection closed {code: 1008, reason: 'Invalid token'}
[WS] Attempting reconnect 1/5
[WS] Connected to server
[WS] Connection closed {code: 1008, reason: 'Invalid token'}
[WS] Attempting reconnect 2/5
... (无限循环)
```

### 修复后

**场景 A: JWT_SECRET 一致（应该是这样）**
```
[WS] Connected to server
[Lobby] ✅ WebSocket connected (real-time updates enabled)
```
- ✅ 连接成功
- ✅ 实时更新工作
- ✅ 控制台干净

**场景 B: 仍然有认证问题（不应该发生）**
```
[WS] Connection closed {code: 1008, reason: 'Invalid token'}
[WS] Authentication failed - will not retry. Please check your login status.
[Lobby] ⚠️ WebSocket connection failed, using polling fallback
```
- ✅ 不再重连
- ✅ 使用 HTTP 轮询
- ✅ 游戏功能正常

## 🎯 验证修复

### 检查 1: 服务器日志

启动服务器后，创建房间时应该看到：

```
[WS] New connection attempt
[WS] Client authenticated: your_username (userId_xxx)
```

**不应该看到**:
```
[WS] Invalid token, closing connection
```

### 检查 2: 客户端日志

进入游戏大厅后，应该只看到一次连接：

```
[WS] Connected to server
```

**不应该看到**:
- 频繁的 `Connection closed`
- 频繁的 `Attempting reconnect`

### 检查 3: 功能测试

- ✅ 创建房间成功
- ✅ 其他玩家加入后，列表实时更新（无需手动刷新）
- ✅ 准备状态实时同步

## 💡 为什么会有这个问题？

### 历史原因

1. **auth-service.ts** 是最初创建的，使用了默认密钥 A
2. **websocket-service.ts** 是后来添加的，使用了默认密钥 B
3. 没有注意到两个文件使用了不同的默认值
4. 如果设置了环境变量 `JWT_SECRET`，这个问题不会出现

### 为什么以前没发现？

- WebSocket 是最近才添加的功能
- 之前主要测试 HTTP API（使用 auth-service）
- WebSocket 测试不充分

## 🛡️ 预防措施

### 推荐做法：使用环境变量

在 `packages/server/.env` 中设置：

```env
JWT_SECRET=your-actual-secret-key-here-at-least-32-characters
```

这样不会依赖代码中的默认值。

### 未来改进

可以创建一个共享的配置文件：

```typescript
// packages/server/src/config/secrets.ts
export const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
```

然后在所有地方导入使用：

```typescript
import { JWT_SECRET } from '../config/secrets';
```

## 📝 已修改的文件

1. **`packages/server/src/services/websocket-service.ts`**
   - 统一 JWT_SECRET 默认值

2. **`packages/client/src/services/websocket-client.ts`**
   - 添加 1008 错误的特殊处理
   - 阻止认证失败的重连

## 📋 总结

- ✅ JWT_SECRET 现在一致
- ✅ 认证失败不再重连
- ✅ 控制台不再刷屏
- ✅ WebSocket 应该能正常工作

**请重启服务器和客户端，重新登录，然后测试！**
