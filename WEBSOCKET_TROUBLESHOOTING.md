# WebSocket 连接问题排查指南

## 🐛 问题现象

用户报告控制台每隔几秒打印：
```
[WS] Connected to server
[WS] Connection closed
[WS] Attempting reconnect 1/5
```

这说明 WebSocket 连接不稳定，一直在断开重连。

## 🔍 诊断步骤

### 步骤 1: 查看关闭原因

我已经在代码中添加了详细的关闭日志。

**重启客户端后**，打开浏览器控制台（F12），查看 `[WS] Connection closed` 日志，应该会显示类似：

```javascript
[WS] Connection closed {
  code: 1008,
  reason: "Invalid token",
  wasClean: true
}
```

### WebSocket 关闭代码含义

| 代码 | 含义 | 可能原因 |
|------|------|----------|
| 1000 | 正常关闭 | 客户端主动断开 |
| 1001 | 端点离开 | 页面刷新或关闭 |
| 1006 | 异常关闭 | 网络问题、服务器崩溃 |
| **1008** | **认证失败** | Token 无效或过期 |
| 1009 | 消息过大 | 发送的消息太大 |
| 1011 | 内部错误 | 服务器内部错误 |

### 步骤 2: 检查后端日志

在运行 `npm run dev` 的服务器终端中，查看是否有以下日志：

**成功连接**：
```
[WS] New connection attempt
[WS] Client authenticated: your_username (userId_xxx)
```

**认证失败**：
```
[WS] New connection attempt
[WS] No token provided, closing connection
或
[WS] Invalid token, closing connection
```

### 步骤 3: 验证 token 是否正确传递

在浏览器控制台运行：

```javascript
// 检查 localStorage 中的 token
localStorage.getItem('auth_token')
```

应该返回一个长字符串（JWT token）。如果返回 `null`，说明没有登录。

### 步骤 4: 检查服务器是否运行

确认服务器正在运行并且 WebSocket 服务已启动：

```bash
cd packages/server
npm run dev
```

应该看到：
```
WebSocket server started on port 3001
```

## 🔧 已实施的修复

### 1. 添加心跳机制

现在客户端每 30 秒发送一次 ping，保持连接活跃。

**文件**: `packages/client/src/services/websocket-client.ts`

```typescript
private startPing(): void {
  this.pingInterval = setInterval(() => {
    if (this.isConnected()) {
      this.ping();
    }
  }, 30000); // 30 seconds
}
```

### 2. 改进关闭日志

现在会显示关闭的详细信息：

```typescript
this.ws.onclose = (event) => {
  console.log('[WS] Connection closed', {
    code: event.code,        // 关闭代码
    reason: event.reason,    // 关闭原因
    wasClean: event.wasClean // 是否正常关闭
  });
  // ...
};
```

### 3. 优化 GameLobby 的 WebSocket 使用

**文件**: `packages/client/src/pages/GameLobby/GameLobby.tsx`

- ✅ WebSocket 连接失败不会阻塞功能
- ✅ 使用 HTTP 轮询作为后备方案（每5秒刷新）
- ✅ 改进了日志输出

```typescript
wsClient.connect()
  .then(() => {
    console.log('[Lobby] ✅ WebSocket connected (real-time updates enabled)');
  })
  .catch(error => {
    console.warn('[Lobby] ⚠️ WebSocket connection failed, using polling fallback');
    // 继续使用轮询，不影响功能
  });
```

## 💡 常见问题和解决方案

### 问题 1: Code 1008 - Invalid token

**原因**: Token 验证失败

**解决方法**：

1. **重新登录**
   ```javascript
   // 在控制台运行
   localStorage.removeItem('auth_token');
   // 然后刷新页面重新登录
   ```

2. **检查 JWT_SECRET**
   - 确保客户端和服务器使用相同的 JWT_SECRET
   - 检查 `packages/server/.env` 文件

### 问题 2: Code 1006 - Abnormal closure

**原因**: 网络连接问题或服务器崩溃

**解决方法**：

1. **检查服务器是否运行**
   ```bash
   cd packages/server
   npm run dev
   ```

2. **检查端口是否被占用**
   ```bash
   # Windows
   netstat -ano | findstr :3001

   # Linux/Mac
   lsof -i :3001
   ```

3. **防火墙设置**
   - 确保防火墙允许 WebSocket 连接
   - 检查端口 3001 是否开放

### 问题 3: 频繁重连

**临时解决方案**: 禁用 WebSocket，仅使用 HTTP 轮询

在 `packages/client/src/pages/GameLobby/GameLobby.tsx` 中注释掉 WebSocket 初始化：

```typescript
// Initialize WebSocket (OPTIONAL - uses polling as fallback)
useEffect(() => {
  if (!token) {
    console.warn('[GameLobby] No token available, skipping WebSocket');
    return;
  }

  // 暂时注释掉 WebSocket
  /*
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
  console.log('[GameLobby] Attempting WebSocket connection:', wsUrl);
  ...
  */

  // 完全禁用 WebSocket，仅使用轮询
  console.log('[GameLobby] WebSocket disabled, using HTTP polling only');
}, [token]);
```

这样系统会完全依赖 HTTP 轮询（每5秒刷新房间列表），虽然不是实时的，但可以正常工作。

## 🎯 当前状态

### 修复后的行为

**如果 WebSocket 连接成功**：
```
[GameLobby] Attempting WebSocket connection: ws://localhost:3001/ws
[WS] Connected to server
[Lobby] ✅ WebSocket connected (real-time updates enabled)
```
- ✅ 实时更新房间状态
- ✅ 玩家加入/离开立即可见
- ✅ 每30秒发送心跳保持连接

**如果 WebSocket 连接失败**：
```
[GameLobby] Attempting WebSocket connection: ws://localhost:3001/ws
[WS] Connection closed { code: 1008, reason: "Invalid token" }
[Lobby] ⚠️ WebSocket connection failed, using polling fallback
```
- ✅ 不会无限重连（最多5次）
- ✅ 回退到 HTTP 轮询
- ✅ 功能正常工作（每5秒更新）
- ✅ 控制台不再刷屏

## 🧪 测试步骤

### 1. 重启客户端

```bash
cd packages/client
# Ctrl+C 停止
npm run dev
```

### 2. 清除缓存并登录

```
Ctrl+Shift+R 强制刷新
```

重新登录，然后进入游戏大厅。

### 3. 观察控制台输出

**期望看到（成功）**：
```
[Auth] Login successful: your_username
[Auth] Token set: true
[GameLobby] Attempting WebSocket connection: ws://localhost:3001/ws
[WS] Connected to server
[Lobby] ✅ WebSocket connected (real-time updates enabled)
```

**或者（失败但可用）**：
```
[Auth] Login successful: your_username
[Auth] Token set: true
[GameLobby] Attempting WebSocket connection: ws://localhost:3001/ws
[WS] Connection closed { code: 1008, ... }
[Lobby] ⚠️ WebSocket connection failed, using polling fallback
[WS] Max reconnect attempts reached
```

### 4. 测试功能

- ✅ 创建房间
- ✅ 查看房间列表
- ✅ 加入房间
- ✅ 开始游戏

**所有功能应该正常工作**，无论 WebSocket 是否连接成功。

## 📋 检查清单

如果 WebSocket 仍然有问题，请检查：

- [ ] 服务器正在运行（`npm run dev` 在 packages/server）
- [ ] 服务器日志显示 `WebSocket server started`
- [ ] 浏览器控制台显示关闭原因（code 和 reason）
- [ ] Token 存在于 localStorage
- [ ] 端口 3001 未被占用
- [ ] 防火墙允许 WebSocket 连接

## 🛠️ 临时解决方案

如果 WebSocket 问题无法立即解决，可以：

1. **完全禁用 WebSocket**（上面提到的方法）
2. **仅使用 HTTP 轮询** - 游戏功能完全可用，只是更新不是即时的
3. **稍后再启用 WebSocket** - 等服务器稳定后再测试

## 📊 性能对比

| 模式 | 实时性 | 服务器负载 | 客户端负载 | 网络流量 |
|------|--------|-----------|-----------|---------|
| WebSocket | 即时 | 低 | 低 | 低 |
| HTTP 轮询 | 5秒延迟 | 中 | 中 | 中 |

对于阿瓦隆游戏：
- **房间大厅**: 轮询足够（5秒延迟可接受）
- **游戏中**: 需要 WebSocket（实时交互）

## 🔍 下一步调试

如果按照上述步骤后仍然有问题，请提供：

1. **控制台完整日志**（包括所有 [WS] 相关的日志）
2. **关闭原因**（code 和 reason）
3. **服务器日志**（后端终端输出）
4. **是否能创建房间**（HTTP 功能是否正常）

这将帮助我们进一步诊断问题！
