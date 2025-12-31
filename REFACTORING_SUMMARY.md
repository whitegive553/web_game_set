# 项目重构总结 - Games 目录迁移到 Monorepo

## 重构概述

将 `games/` 目录从项目根目录迁移到 `packages/games`，使其成为标准的 npm workspace 包，统一 monorepo 架构。

## 重构前的问题

### 1. 结构混乱
```
web_llm/
├── packages/          # workspace packages
│   ├── client/
│   ├── server/
│   ├── shared/
│   └── game-engine/
└── games/             # ❌ 不在 workspace 中
    └── avalon/
```

### 2. 导入路径复杂
```typescript
// 旧的导入方式
import { AvalonGame } from '../../../../games/avalon/avalon-game';
```

### 3. 构建流程复杂
```json
"build": "cd games && npx tsc && cp dist/avalon/*.js avalon/ && ..."
```
需要手动复制编译文件，容易出错。

### 4. 依赖管理混乱
- games 不是 npm package
- 没有 package.json
- 依赖关系不明确

## 重构后的结构

### 1. 统一的 Monorepo 结构
```
web_llm/
└── packages/          # 所有包都在这里
    ├── client/
    ├── server/
    ├── shared/
    ├── game-engine/
    └── games/         # ✅ 标准 workspace package
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            └── avalon/
                ├── avalon-game.ts
                └── config.json
```

### 2. 清晰的导入路径
```typescript
// 新的导入方式
import { AvalonGame } from '@survival-game/games';
```

### 3. 简化的构建流程
```json
"build": "npm run build --workspaces --if-present"
```
npm workspaces 自动处理依赖顺序和构建。

### 4. 明确的依赖管理
```json
// packages/games/package.json
{
  "name": "@survival-game/games",
  "dependencies": {
    "@survival-game/shared": "*"
  }
}

// packages/server/package.json
{
  "dependencies": {
    "@survival-game/games": "*"
  }
}
```

## 修改文件清单

### 新增文件
- `packages/games/package.json` - Games package 配置
- `packages/games/tsconfig.json` - TypeScript 配置
- `packages/games/src/index.ts` - 导出入口
- `packages/games/src/avalon/avalon-game.ts` - 迁移的游戏逻辑
- `packages/games/src/avalon/config.json` - 迁移的配置文件

### 修改文件
- `package.json` - 简化 build 脚本
- `packages/server/package.json` - 添加 @survival-game/games 依赖
- `packages/server/src/routes/avalon-routes.ts` - 更新导入路径
- `packages/server/Dockerfile` - 更新构建步骤
- `.gitignore` - 清理旧的 games 忽略规则

### 删除文件
- `games/` - 整个旧目录

## 优势

### 1. 架构一致性
✅ 所有代码都在 `packages/` 下
✅ 遵循 monorepo 最佳实践
✅ 易于扩展新的游戏

### 2. 依赖管理
✅ npm workspaces 自动管理依赖
✅ 符号链接自动创建
✅ 依赖关系清晰明确

### 3. 构建简化
✅ 无需手动复制文件
✅ TypeScript 自动处理路径
✅ 一条命令构建所有包

### 4. 开发体验
✅ IDE 自动补全更好
✅ 导入路径更清晰
✅ 类型检查更准确

### 5. 部署可靠
✅ Docker 构建更简单
✅ 无复杂的文件复制逻辑
✅ 减少路径解析错误

## 迁移指南（如需添加新游戏）

### 1. 创建新游戏目录
```bash
mkdir -p packages/games/src/new-game
```

### 2. 添加游戏实现
```typescript
// packages/games/src/new-game/new-game.ts
export class NewGame {
  // 游戏逻辑
}
```

### 3. 更新导出
```typescript
// packages/games/src/index.ts
export { AvalonGame } from './avalon/avalon-game';
export { NewGame } from './new-game/new-game';  // 新增
```

### 4. 构建测试
```bash
npm run build --workspace=packages/games
```

## 验证清单

- [x] 本地构建成功
- [x] 服务器启动正常
- [x] AvalonGame 导入成功
- [x] 历史服务正常工作
- [x] Docker 构建配置更新
- [x] 所有测试通过
- [x] 代码推送到远程

## 部署说明

### 服务器部署步骤
```bash
# 1. SSH 到服务器
ssh root@your-server

# 2. 拉取最新代码
cd /opt/web_game_set/web_game_set
git pull

# 3. 停止旧服务
docker compose down

# 4. 清除缓存（重要！）
docker builder prune -f

# 5. 重新构建和部署
./deploy.sh
```

### 预期日志
```
[AvalonRoutes] Module loaded, AvalonGame: OK
[AvalonRoutes] avalonHistoryService loaded: OK
[AvalonHistory] ========================================
[AvalonHistory] Creating directory: /app/data/avalon/games/xxxxx
[AvalonHistory] ✓ Directory created successfully
```

## 回滚方案

如果重构出现问题，可以回滚到上一个提交：

```bash
git revert a4a7a37
git push
```

或者直接回退到重构前的提交：

```bash
git reset --hard 98323e0
git push --force  # 谨慎使用
```

## 技术债务清理

此次重构解决的技术债务：
- ✅ 不规范的项目结构
- ✅ 复杂的相对路径导入
- ✅ 手动文件复制逻辑
- ✅ TypeScript rootDir 冲突
- ✅ 不清晰的依赖关系

## 未来改进建议

1. **添加游戏接口** - 为所有游戏定义统一接口
2. **游戏注册机制** - 自动发现和注册新游戏
3. **共享游戏工具** - 提取通用游戏逻辑到 shared
4. **游戏测试** - 为每个游戏添加单元测试
5. **文档完善** - 为每个游戏添加详细文档

## 总结

这次重构：
- 🎯 **目标明确** - 统一项目结构
- 🔧 **执行彻底** - 修改所有相关文件
- ✅ **测试充分** - 本地验证通过
- 📝 **文档完整** - 记录所有变更
- 🚀 **部署就绪** - 更新了部署流程

项目现在拥有了更清晰、更易维护的架构！
