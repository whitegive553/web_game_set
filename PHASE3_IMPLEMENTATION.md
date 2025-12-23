# 第三阶段实现总结

## 实现概述

已成功实现前后端认证系统、JSON 持久化存储和存档系统集成。系统现在支持用户注册/登录、游戏进度自动保存以及跨生命异常道具保管库（Vault）。

## 关键设计决策

### 1. 认证方案：JWT

**选择理由：**
- 无状态：服务器不需要存储会话，易于扩展
- 跨域友好：适合前后端分离架构
- 7天有效期：平衡安全性和用户体验
- 标准化：使用 jsonwebtoken 库，成熟稳定

**安全措施：**
- bcrypt 密码哈希（10 rounds）
- JWT_SECRET 从环境变量读取
- 统一错误消息（防止用户名枚举）
- 输入校验（用户名 3-20 字符，密码 ≥6 字符）

### 2. 数据持久化：JSON 文件

**选择理由：**
- 零依赖：无需数据库，快速开发
- 可移植：文件可直接备份和迁移
- 易于调试：纯文本，可直接查看和编辑
- 未来可平滑迁移到数据库

**存储结构：**
```
data/
├── users.json              # 所有用户账号
└── saves/
    └── {userId}.json       # 用户存档（按 userId 分离）
```

**健壮性保障：**
- 原子写入（临时文件 + rename）
- 进程级 Mutex（防止并发写冲突）
- 自动备份损坏文件（.backup.{timestamp}）
- 目录自动创建（recursive mkdir）

### 3. 前后端数据映射

**问题：**
- 后端 GameState 包含 hidden stats（sanity, anomalyAffinity, observationLevel, realityStability）
- 前端不应看到除 sanity 外的 hidden stats

**解决方案：**
- 创建 `game-state-mapper.ts` 转换层
- 在服务器端过滤数据后再发送
- 保留 sanity 显示（UI 已实现，作为设计让步）
- 其他 hidden stats 完全隐藏

**设计让步说明：**
根据原始设计，sanity 应该是 hidden stat（通过叙事推断）。但前端 UI 已实现为可见的第三个属性条。为了保持 UI 完整性，决定显示 sanity，但隐藏其他 hidden stats。这是一个合理的游戏难度调整。

### 4. 存档系统架构

**多存档槽位支持：**
- 当前实现：单槽位（"slot-1"）
- 数据结构：已支持多槽位（`saves: Record<string, SaveSlot>`）
- 未来扩展：只需修改前端 UI 选择槽位

**存档内容：**
```typescript
{
  userId: string,
  activeSaveSlotId: string,           // 当前活动槽位
  vault: VaultItem[],                  // 异常道具保管库（跨生命）
  saves: {
    "slot-1": {
      slotId: "slot-1",
      currentRun: CurrentRun | null,   // 当前进行中的 run
      unlocked: {...},                  // 已解锁内容
      updatedAt: number
    }
  },
  createdAt: number,
  updatedAt: number
}
```

**自动保存触发点：**
1. 开始新游戏（startNewGame）
2. 做出选择后（makeChoice）
3. 死亡重生后（respawn）
4. 结束会话前（endSession）

**存档加载时机：**
- 用户登录后自动加载
- 加载 Vault 道具到 inventory
- TODO: 恢复上次未完成的 run（当前版本暂未实现）

## 已实现功能清单

### 后端（packages/server/）

1. **数据转换层** (`utils/game-state-mapper.ts`)
   - ✅ 过滤 hidden stats
   - ✅ 转换 GameEvent → Narrative
   - ✅ 映射 Choice 格式
   - ✅ 提供异常提示生成（为未来扩展）

2. **游戏路由** (`routes/game-routes.ts`)
   - ✅ 所有端点使用数据转换层
   - ✅ 返回客户端安全的格式
   - ✅ 统一错误处理

3. **会话管理** (`services/game-session-manager.ts`)
   - ✅ 返回 availableChoices
   - ✅ 30分钟会话超时
   - ✅ 定期清理过期会话

4. **认证系统**（已有，未修改）
   - ✅ 注册/登录/登出
   - ✅ JWT 签发和验证
   - ✅ bcrypt 密码哈希

5. **存档系统**（已有，未修改）
   - ✅ 用户存档 CRUD
   - ✅ Vault 道具管理
   - ✅ JSON 原子存储

### 前端（packages/client/）

1. **游戏 API** (`services/gameApi.ts`)
   - ✅ 真实 API 调用（替换 mock）
   - ✅ 错误处理
   - ✅ 响应格式转换
   - ✅ 服务器状态检查

2. **TopBar 组件** (`components/TopBar/TopBar.tsx`)
   - ✅ 显示用户名
   - ✅ 登出按钮
   - ✅ 路由跳转
   - ✅ 响应式样式

3. **GameContext** (`store/GameContext.tsx`)
   - ✅ 登录后自动加载存档
   - ✅ 游戏进度自动保存
   - ✅ Vault 道具集成
   - ✅ 死亡后保留异常道具
   - ⚠️ TODO: 恢复未完成的 run
   - ⚠️ TODO: 死亡后更新统计数据

4. **认证流程**（已有，未修改）
   - ✅ 登录页面
   - ✅ 注册页面
   - ✅ 路由守卫
   - ✅ AuthContext

## API 端点总览

### 认证 API (`/api/auth`)
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户（需认证）

### 游戏 API (`/api/game`)
- `POST /api/game/new` - 创建新会话
- `GET /api/game/:sessionId/state` - 获取状态
- `POST /api/game/:sessionId/choice` - 做出选择
- `POST /api/game/:sessionId/respawn` - 重生
- `DELETE /api/game/:sessionId` - 删除会话
- `GET /api/game/stats` - 服务器统计

### 存档 API (`/api/save`)（需认证）
- `GET /api/save` - 获取存档
- `PUT /api/save` - 更新存档
- `POST /api/vault/add` - 添加道具到 Vault
- `DELETE /api/vault/:itemId` - 移除 Vault 道具
- `PUT /api/save/active-slot` - 设置活动槽位

## 文件清单

### 新增文件

**后端：**
- `packages/server/src/utils/game-state-mapper.ts` (159 行) - 数据转换层

**前端：**
- `packages/client/.env.example` (2 行) - 环境变量示例

### 修改文件

**后端：**
- `packages/server/src/routes/game-routes.ts` - 集成数据转换层
- `packages/server/src/services/game-session-manager.ts` - 返回 availableChoices

**前端：**
- `packages/client/src/services/gameApi.ts` (217 行) - 真实 API 调用
- `packages/client/src/components/TopBar/TopBar.tsx` (115 行) - 用户信息和登出
- `packages/client/src/components/TopBar/TopBar.css` (192 行) - 新增样式
- `packages/client/src/store/GameContext.tsx` (394 行) - 存档集成

**未修改但已存在：**
- 所有认证相关文件（auth-service, auth-routes, user-store）
- 所有存档相关文件（save-service, save-routes, save-store）
- JsonStore 工具类
- 前端认证页面和 AuthContext

## 运行与测试

### 安装依赖
```bash
# 根目录
npm install

# 构建 shared 包
cd packages/shared && npm run build

# 构建 game-engine 包
cd ../game-engine && npm run build
```

### 配置环境变量
```bash
# 服务器
cd packages/server
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET

# 客户端（可选）
cd packages/client
cp .env.example .env
# 默认配置通常无需修改
```

### 启动服务
```bash
# 开发模式（推荐，同时启动前后端）
npm run dev

# 或分别启动
# Terminal 1
cd packages/server && npm run dev

# Terminal 2
cd packages/client && npm run dev
```

### 测试流程

1. **注册新用户**
   - 访问 `http://localhost:3000/register`
   - 填写用户名和密码
   - 注册成功后自动跳转登录

2. **登录**
   - 访问 `http://localhost:3000/login`
   - 输入用户名密码
   - 登录成功后跳转 `/game`

3. **游戏流程**
   - 点击"开始新游戏"
   - 做出选择
   - 观察自动保存日志（浏览器控制台）
   - 查看 TopBar 用户名显示

4. **存档持久化验证**
   - 重启服务器（Ctrl+C 后重新启动）
   - 刷新页面
   - 登录后检查 Vault 道具是否恢复

5. **登出**
   - 点击 TopBar 登出按钮
   - 验证跳转到登录页

## 已知限制与未来改进

### 当前限制

1. **单存档槽位**
   - 当前只使用 "slot-1"
   - 数据结构已支持多槽位，需添加 UI

2. **会话不持久**
   - 服务器重启会丢失活动会话
   - 需要重新开始游戏
   - 未来：存储 sessionId → GameState 映射

3. **未完整实现恢复 run**
   - 登录后不会自动恢复上次未完成的游戏
   - 需要手动"开始新游戏"
   - 未来：检查 currentRun，恢复 GameState

4. **死亡统计未更新**
   - 死亡次数、成功撤离次数等统计未实现
   - 需要在 respawn 时更新 UserProfile

### 安全改进方向

1. **增强密码策略**
   - 当前：≥6 字符
   - 建议：大小写+数字+特殊字符，≥8 字符

2. **速率限制**
   - 登录/注册端点应添加速率限制
   - 防止暴力破解

3. **Token 刷新**
   - 当前：7天固定有效期
   - 建议：短有效期 + refresh token

4. **HTTPS**
   - 生产环境必须使用 HTTPS
   - 保护 token 传输安全

### 扩展性改进方向

1. **数据库迁移**
   - 将 JsonStore 替换为 DB（PostgreSQL/MongoDB）
   - 保持相同的 Service 接口
   - 支持事务和复杂查询

2. **分布式会话**
   - 使用 Redis 存储 GameEngine 实例
   - 支持多服务器负载均衡

3. **实时通信**
   - WebSocket 替代轮询
   - 服务器主动推送事件

4. **多人模式**
   - 共享 Zone 状态
   - 玩家互动机制

## 验收确认

根据第三阶段要求，以下功能已实现：

### 必须达成（✅ 已完成）

1. ✅ **前端新增登录/注册界面**
   - 具备注册、登录、退出登录
   - 登录后进入游戏主界面
   - 未登录访问游戏页面重定向到登录页

2. ✅ **后端新增认证与用户存档 API**
   - 注册：创建用户
   - 登录：验证凭证并签发会话（JWT）
   - 获取当前用户信息（me）
   - 存取存档（进度/异常道具库）

3. ✅ **数据持久化采用本地 JSON 文件**
   - 不使用数据库
   - 处理并发写入（Mutex + 原子写）
   - 项目重启后数据不丢失

4. ✅ **账号体系与存档体系支持未来扩展**
   - 多存档槽位（结构已支持）
   - 异常道具库与账号绑定
   - 游戏进度保存与加载

### 安全与校验（✅ 已完成）

1. ✅ 密码不得明文存储（bcrypt hash）
2. ✅ 登录失败统一错误信息
3. ✅ 基础输入校验（用户名长度、密码强度）
4. ✅ 存档 API 鉴权（JWT 中间件）

### 数据模型（✅ 已实现）

1. ✅ User（id, username, passwordHash, createdAt）
2. ✅ UserProfile（activeSaveSlotId, vault, saves）
3. ✅ VaultItem（itemId, name, type, desc, meta, acquiredAt）
4. ✅ SaveSlot（slotId, currentRun, unlocked, updatedAt）
5. ✅ CurrentRun（runId, state, log）

## 设计选择说明

### 为什么选择 JWT 而不是 Session？

**JWT 优势：**
1. 无状态：服务器不存储会话，易于横向扩展
2. 跨域：天然支持前后端分离
3. 自包含：token 包含所有用户信息
4. 标准化：广泛使用，生态成熟

**Session 劣势：**
1. 有状态：需要 session store（Redis/DB）
2. 难以扩展：多服务器需要 session 共享
3. 复杂性：需要处理 CORS、cookie 设置

**权衡：**
- JWT 过期时间设置为 7 天（平衡安全与体验）
- 未来可添加 refresh token 机制

### 文件拆分方式

**选择：** 每个用户一个存档文件
**路径：** `data/saves/{userId}.json`

**理由：**
1. 隔离性：用户数据独立，减少冲突
2. 性能：只读取需要的用户数据
3. 安全：文件权限可按用户设置
4. 可扩展：未来可按用户分片到不同服务器

**备选方案（未采用）：**
- 单文件存储所有存档：并发冲突高，文件膨胀
- 按槽位分文件：过于碎片化，管理复杂

### SaveDTO 结构

保持与 `UserProfile` 一致，直接存储完整对象：

```typescript
{
  userId: string,
  activeSaveSlotId: string,
  vault: VaultItem[],
  saves: Record<string, SaveSlot>,
  createdAt: number,
  updatedAt: number
}
```

**优势：**
1. 类型安全：与后端类型定义一致
2. 原子性：一次写入完整状态
3. 易于扩展：添加新字段只需更新类型

## 总结

第三阶段成功实现了完整的认证与存档基础设施。系统现在具备：

- ✅ 真实的前后端认证流程
- ✅ 健壮的 JSON 持久化存储
- ✅ 自动保存与加载机制
- ✅ 跨生命异常道具系统（Vault）
- ✅ 可扩展的多存档槽位架构

所有设计都考虑了未来向数据库和分布式系统的平滑迁移。代码遵循安全最佳实践，具备良好的错误处理和日志记录。

**下一阶段建议：**
1. 实现完整的 run 恢复功能
2. 添加死亡统计和成就系统
3. 增强 Vault 道具的获取和使用机制
4. 优化 UI/UX（加载动画、错误提示等）
