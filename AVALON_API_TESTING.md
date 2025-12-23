# 阿瓦隆 API 测试文档

## 环境准备

### 1. 启动服务器

```bash
cd packages/server
npm run dev
```

服务器将在 `http://localhost:3001` 启动，WebSocket 在 `ws://localhost:3001/ws`

### 2. 创建测试用户

使用以下命令或工具（如 Postman、curl）创建至少6个测试用户：

```bash
# 用户 1
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "password": "123456"}'

# 用户 2
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "player2", "password": "123456"}'

# ... 重复创建 player3, player4, player5, player6
```

每个请求将返回：
```json
{
  "success": true,
  "data": {
    "user": { "id": "xxx", "username": "playerX", "createdAt": 123456 },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**保存每个用户的 token**，后续请求需要使用。

---

## API 测试流程

### 步骤 1: 创建房间（Host）

使用 player1 的 token 创建房间：

```bash
curl -X POST http://localhost:3001/api/lobby/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player1_token>" \
  -d '{
    "gameId": "avalon",
    "name": "Test Avalon Game",
    "maxPlayers": 6
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "roomId": "room_xxx",
    "gameId": "avalon",
    "hostUserId": "player1_id",
    "name": "Test Avalon Game",
    "maxPlayers": 6,
    "players": [
      {
        "userId": "player1_id",
        "username": "player1",
        "ready": false,
        "connected": true
      }
    ],
    "status": "lobby",
    "createdAt": 123456
  }
}
```

**保存 `roomId`** 用于后续步骤。

---

### 步骤 2: 其他玩家加入房间

使用 player2-6 的 token 加入房间：

```bash
curl -X POST http://localhost:3001/api/lobby/rooms/<roomId>/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player2_token>"

# 重复 player3, player4, player5, player6
```

---

### 步骤 3: 所有玩家准备

每个玩家设置准备状态：

```bash
curl -X POST http://localhost:3001/api/lobby/rooms/<roomId>/ready \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player_token>" \
  -d '{"ready": true}'
```

---

### 步骤 4: 开始游戏（Host）

所有玩家准备后，host 启动游戏：

```bash
curl -X POST http://localhost:3001/api/avalon/<roomId>/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player1_token>"
```

响应：
```json
{
  "success": true,
  "data": {
    "matchId": "match_xxx",
    "publicState": {
      "phase": "ROLE_REVEAL",
      "round": 0,
      "leader": "player1_id",
      "questResults": [],
      "goodWins": 0,
      "evilWins": 0
    }
  }
}
```

**保存 `matchId`** 用于游戏操作。

---

### 步骤 5: 获取玩家状态

每个玩家查看自己的角色和信息：

```bash
curl -X GET http://localhost:3001/api/avalon/<matchId>/state \
  -H "Authorization: Bearer <player_token>"
```

响应示例（梅林玩家）：
```json
{
  "success": true,
  "data": {
    "publicState": {
      "phase": "NOMINATION",
      "round": 1,
      "leader": "player1_id",
      ...
    },
    "privateState": {
      "userId": "player1_id",
      "role": "merlin",
      "team": "good",
      "evilPlayers": ["player3_id", "player5_id"]
    }
  }
}
```

---

### 步骤 6: 游戏流程

#### 6.1 队长提名队伍

当前队长提名任务小队（根据当前轮次的 teamSize）：

```bash
curl -X POST http://localhost:3001/api/avalon/<matchId>/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <leader_token>" \
  -d '{
    "type": "NOMINATE_TEAM",
    "payload": {
      "teamUserIds": ["player1_id", "player2_id", "player3_id"]
    }
  }'
```

#### 6.2 所有玩家投票队伍

所有玩家对提名的队伍投票（赞成/反对）：

```bash
curl -X POST http://localhost:3001/api/avalon/<matchId>/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player_token>" \
  -d '{
    "type": "VOTE_TEAM",
    "payload": {
      "approve": true
    }
  }'
```

#### 6.3 任务投票（仅队伍成员）

如果队伍投票通过，被提名的队伍成员进行任务投票：

```bash
# 善良玩家只能投成功
curl -X POST http://localhost:3001/api/avalon/<matchId>/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <good_player_token>" \
  -d '{
    "type": "VOTE_QUEST",
    "payload": {
      "success": true
    }
  }'

# 邪恶玩家可以投失败
curl -X POST http://localhost:3001/api/avalon/<matchId>/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <evil_player_token>" \
  -d '{
    "type": "VOTE_QUEST",
    "payload": {
      "success": false
    }
  }'
```

#### 6.4 刺杀阶段（善良3次成功后）

如果善良阵营赢得3次任务，进入刺杀阶段。刺客选择目标：

```bash
curl -X POST http://localhost:3001/api/avalon/<matchId>/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <assassin_token>" \
  -d '{
    "type": "ASSASSINATE",
    "payload": {
      "targetUserId": "suspected_merlin_id"
    }
  }'
```

---

### 步骤 7: 查看游戏历史

查看所有游戏事件：

```bash
curl -X GET http://localhost:3001/api/avalon/<matchId>/events \
  -H "Authorization: Bearer <player_token>"
```

---

## WebSocket 连接测试

### 连接 WebSocket

使用 WebSocket 客户端（如 `wscat` 或浏览器 WebSocket）：

```bash
npm install -g wscat
wscat -c "ws://localhost:3001/ws?token=<player_token>"
```

### 加入房间

连接后发送：
```json
{"type": "JOIN_ROOM", "payload": {"roomId": "room_xxx"}}
```

### 接收实时事件

WebSocket 将实时推送游戏事件：
```json
{
  "type": "GAME_EVENT",
  "payload": {
    "eventId": "event_xxx",
    "matchId": "match_xxx",
    "gameId": "avalon",
    "type": "TEAM_NOMINATED",
    "payload": {
      "leader": "player1_id",
      "team": ["player1_id", "player2_id", "player3_id"]
    },
    "visibleTo": "all"
  }
}
```

---

## 完整游戏流程示例

1. **注册 6 个账号**
2. **player1 创建房间**
3. **player2-6 加入房间**
4. **所有玩家设置 ready**
5. **player1 开始游戏**
6. **所有玩家查看自己的角色**
7. **进行 5 轮任务**：
   - 队长提名 → 全员投票 → 队伍执行任务
   - 重复直到某方赢得 3 轮
8. **刺杀阶段**（如果善良 3 胜）
9. **游戏结束，查看结果**

---

## API 端点总结

### 游戏大厅 API（`/api/lobby`）
- `POST /rooms` - 创建房间
- `GET /rooms` - 列出所有房间
- `GET /rooms/:roomId` - 获取房间详情
- `POST /rooms/:roomId/join` - 加入房间
- `POST /rooms/:roomId/leave` - 离开房间
- `POST /rooms/:roomId/ready` - 设置准备状态
- `POST /rooms/:roomId/start` - 开始游戏（重定向到游戏专用API）
- `DELETE /rooms/:roomId` - 删除房间

### 阿瓦隆游戏 API（`/api/avalon`）
- `POST /:roomId/start` - 开始阿瓦隆游戏
- `POST /:matchId/action` - 执行游戏操作
  - `NOMINATE_TEAM` - 提名队伍
  - `VOTE_TEAM` - 队伍投票
  - `VOTE_QUEST` - 任务投票
  - `ASSASSINATE` - 刺杀
- `GET /:matchId/state` - 获取游戏状态（公开+私密）
- `GET /:matchId/events` - 获取游戏事件历史

### WebSocket（`ws://localhost:3001/ws`）
- 查询参数：`?token=<jwt_token>`
- 客户端消息：
  - `JOIN_ROOM` - 加入房间
  - `LEAVE_ROOM` - 离开房间
  - `PING` - 心跳检测
- 服务器推送：
  - `CONNECTED` - 连接成功
  - `GAME_EVENT` - 游戏事件
  - `PLAYER_JOINED` - 玩家加入
  - `PLAYER_LEFT` - 玩家离开
  - `PLAYER_READY` - 玩家准备
  - `ROOM_DELETED` - 房间删除

---

## 调试技巧

1. **检查服务器日志**：服务器会输出详细的操作日志
2. **使用 Postman Collection**：可以创建 Postman collection 保存所有请求
3. **WebSocket 调试**：使用浏览器开发者工具的 Network > WS 查看 WebSocket 通信
4. **数据持久化**：房间数据保存在 `data/rooms/rooms.json`

---

## 常见错误

### 1. "Room not found"
- 确认 roomId 正确
- 检查房间是否已被删除

### 2. "Not all players are ready"
- 所有玩家必须先设置 `ready: true`

### 3. "Avalon requires 6-10 players"
- 阿瓦隆游戏需要 6-10 名玩家才能开始

### 4. "Only leader can nominate"
- 只有当前轮次的队长可以提名队伍
- 检查 `publicState.leader` 确认队长

### 5. "Good players must vote success"
- 善良阵营玩家只能在任务中投成功票
- 检查 `privateState.team` 确认阵营

---

## 下一步

- 创建前端游戏大厅界面
- 创建阿瓦隆游戏 UI 组件
- 添加游戏历史记录系统
- 优化 WebSocket 断线重连机制
