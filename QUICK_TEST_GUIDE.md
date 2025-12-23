# 快速测试指南 - 阿瓦隆游戏

## 🚀 启动步骤

### 1. 启动后端服务器

```bash
cd packages/server
npm run dev
```

确认看到以下输出：
```
Server running on port 3001
Lobby API: http://localhost:3001/api/lobby
Avalon API: http://localhost:3001/api/avalon
WebSocket: ws://localhost:3001/ws
```

### 2. 启动前端客户端

新开一个终端窗口：

```bash
cd packages/client
npm run dev
```

确认看到：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

## 🧪 测试流程

### 步骤 1: 检查浏览器控制台

1. 打开浏览器访问 `http://localhost:3000`
2. 按 `F12` 打开开发者工具
3. 切换到 **Console** 标签

### 步骤 2: 登录账号

1. 如果还没有账号，先注册一个：
   - 用户名：`test1`
   - 密码：`123456`

2. 登录后应该看到主菜单

### 步骤 3: 进入游戏大厅

1. 点击 **"多人游戏大厅"** 按钮
2. 查看控制台，应该看到：
   ```
   [GameLobby] Component rendered
   [GameLobby] Initializing WebSocket: ws://localhost:3001/ws
   [Lobby] WebSocket connected successfully
   ```

### 步骤 4: 测试游戏选择

1. 点击 **"阿瓦隆"** 卡片
2. 查看控制台，应该看到：
   ```
   [GameLobby] Game selected: avalon
   [GameLobby] Component rendered { selectedGame: 'avalon', ... }
   ```

3. 点击 **"文字冒险"** 卡片
4. 查看控制台，应该看到：
   ```
   [GameLobby] Game selected: text-adventure
   [GameLobby] Component rendered { selectedGame: 'text-adventure', ... }
   ```

5. **切换回"阿瓦隆"**

### 步骤 5: 测试创建房间

1. 点击 **"创建房间"** 按钮
2. 查看控制台，应该看到：
   ```
   [GameLobby] Opening create room modal
   [GameLobby] Component rendered { showCreateModal: true, ... }
   ```

3. 应该看到弹出的模态框，包含：
   - 房间名称输入框
   - 最大玩家数输入框（6-10）
   - "取消" 和 "创建" 按钮

4. 输入房间名称：`测试房间1`

5. 点击 **"创建"** 按钮

6. 查看控制台，应该看到：
   ```
   [GameLobby] Creating room: { gameId: 'avalon', name: '测试房间1', maxPlayers: 6 }
   ```

7. 查看 **Network** 标签，应该看到：
   ```
   POST http://localhost:3001/api/lobby/rooms
   Status: 200
   ```

8. 如果创建成功，页面会自动跳转到房间等待界面：
   ```
   /lobby/avalon/room_xxx
   ```

## ❌ 常见问题排查

### 问题 1: 点击游戏卡片没有反应

**检查清单**：

1. 打开浏览器控制台（F12），查看是否有错误
2. 确认是否看到 `[GameLobby] Component rendered`
3. 尝试手动点击，看控制台是否输出 `[GameLobby] Game selected:`
4. 检查是否有红色错误信息

**可能的原因**：
- JavaScript 错误导致组件崩溃
- CSS 样式阻止了点击事件
- React 没有正确渲染组件

**解决方法**：
```bash
# 清除浏览器缓存
按 Ctrl+Shift+R 强制刷新

# 重启客户端
cd packages/client
# Ctrl+C 停止
npm run dev
```

### 问题 2: 点击"创建房间"没有反应

**检查清单**：

1. 查看控制台是否有 `[GameLobby] Opening create room modal`
2. 检查是否有 loading 状态（按钮被禁用）
3. 查看是否有错误信息

**解决方法**：
- 确认后端服务器正在运行
- 刷新页面重试

### 问题 3: 创建房间后没有跳转

**检查 Network 标签**：

1. 切换到 Network 标签
2. 筛选 XHR/Fetch 请求
3. 找到 `POST /api/lobby/rooms` 请求
4. 查看响应内容

**可能看到的响应**：

成功响应：
```json
{
  "success": true,
  "data": {
    "roomId": "room_xxx",
    "gameId": "avalon",
    "players": [...],
    "status": "lobby"
  }
}
```

失败响应：
```json
{
  "success": false,
  "error": "Unauthorized" // 或其他错误信息
}
```

**如果看到 401 Unauthorized**：
- Token 可能过期，重新登录

**如果看到 500 Internal Server Error**：
- 查看后端服务器日志
- 可能是数据库或游戏逻辑错误

### 问题 4: WebSocket 连接失败

**控制台错误**：
```
[Lobby] WebSocket connection failed: ...
[Lobby] Continuing without WebSocket (polling will be used)
```

**这不是致命错误**：
- 创建房间功能仍然可用
- 会使用轮询代替实时更新
- 每 5 秒自动刷新房间列表

**完全修复 WebSocket**：
1. 确认后端服务器显示 `WebSocket server started`
2. 检查防火墙设置
3. 尝试重启服务器

## 📊 调试技巧

### 查看所有控制台日志

确保控制台过滤器设置为 "All levels"，不要过滤掉 warnings 和 info。

### 查看网络请求

1. Network 标签 → 筛选 "Fetch/XHR"
2. 应该看到定期的 `/api/lobby/rooms?gameId=avalon` 请求
3. WebSocket 标签应该显示连接状态

### 查看 React 组件状态

在控制台中查看组件渲染日志：
```
[GameLobby] Component rendered {
  selectedGame: 'avalon',
  showCreateModal: false,
  loading: false
}
```

每次状态改变都会有新的日志。

## 🎮 完整测试流程（单用户）

测试创建房间并进入等待界面：

1. ✅ 登录
2. ✅ 进入游戏大厅
3. ✅ 选择"阿瓦隆"
4. ✅ 点击"创建房间"
5. ✅ 输入房间名称
6. ✅ 点击"创建"按钮
7. ✅ 自动跳转到 `/lobby/avalon/room_xxx`
8. ✅ 看到房间等待界面，显示自己作为房主

## 🎮 多用户测试流程

测试完整的游戏流程需要至少 6 个账号：

### 准备工作

1. 注册 6 个测试账号：
   - test1 / 123456
   - test2 / 123456
   - test3 / 123456
   - test4 / 123456
   - test5 / 123456
   - test6 / 123456

2. 打开 6 个浏览器窗口或隐身窗口

### 测试步骤

**窗口 1 (test1 - 房主)**：
1. 登录 → 游戏大厅 → 创建房间 "测试房间"
2. 进入房间等待界面
3. 等待其他玩家加入

**窗口 2-6 (test2-test6)**：
1. 登录 → 游戏大厅
2. 在房间列表中找到 "测试房间"
3. 点击"加入"
4. 进入房间等待界面
5. 点击"准备"按钮

**窗口 1 (test1 - 房主)**：
1. 等待所有人准备完毕
2. "开始游戏" 按钮变为可用
3. 点击"开始游戏"
4. 所有玩家自动跳转到游戏界面

## 📝 预期结果

### 成功标志

1. ✅ 点击游戏卡片有选中效果
2. ✅ 点击"创建房间"弹出模态框
3. ✅ 创建房间后自动跳转
4. ✅ 控制台没有红色错误
5. ✅ Network 标签显示成功的 API 请求

### 失败标志

1. ❌ 点击没有任何反应
2. ❌ 控制台有红色错误
3. ❌ Network 标签没有请求
4. ❌ 按钮一直处于禁用状态

## 🔧 紧急修复

如果测试完全失败，尝试以下步骤：

```bash
# 1. 停止所有服务
# Ctrl+C 停止前端和后端

# 2. 清除缓存
cd packages/client
rm -rf node_modules/.vite
rm -rf dist

# 3. 重启服务器
cd ../server
npm run dev

# 4. 新终端重启客户端
cd ../client
npm run dev

# 5. 完全刷新浏览器
按 Ctrl+Shift+Delete 清除缓存
或者使用隐身模式
```

## 📧 报告问题

如果问题仍然存在，请提供以下信息：

1. 浏览器控制台的完整日志（Console 标签）
2. Network 标签的请求列表截图
3. 后端服务器终端输出
4. 操作步骤描述

这将帮助快速定位问题！
