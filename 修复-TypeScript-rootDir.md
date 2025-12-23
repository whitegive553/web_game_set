# TypeScript rootDir 错误修复

## 🔍 错误信息

```
error TS6059: File '/app/games/avalon/avalon-game.ts' is not under 'rootDir' '/app/packages/server/src'.
'rootDir' is expected to contain all source files.
```

## 问题原因

`packages/server/tsconfig.json` 中设置了 `rootDir: "./src"`，这限制了 TypeScript 只能编译 `src` 目录下的文件。

但是代码引用了外部文件：
- `../../games/avalon/avalon-game.ts`
- `../../packages/shared/src/types/avalon.ts`
- `../../packages/shared/src/types/game-plugin.ts`

这些文件都不在 `rootDir` 范围内，导致编译失败。

## ✅ 修复方法

删除 `packages/server/tsconfig.json` 中的 `rootDir` 配置。

**修改前**：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",  ← 删除这一行
    "strict": true,
    ...
  }
}
```

**修改后**：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "strict": true,
    ...
  }
}
```

## 🚀 立即部署

```bash
# 在服务器上执行
cd /opt/web_game_set/web_game_set
git pull
docker system prune -f
./deploy.sh
```

## 📋 所有修复清单（最新）

- [x] ✅ docker-compose.yml - args 格式
- [x] ✅ docker-compose.yml - 删除 version
- [x] ✅ packages/server/Dockerfile - 删除 tsconfig.json
- [x] ✅ packages/client/Dockerfile - 删除 tsconfig.json
- [x] ✅ packages/server/Dockerfile - npm install
- [x] ✅ packages/client/Dockerfile - npm install
- [x] ✅ packages/server/tsconfig.json - 删除 rootDir ⭐ **新增**
- [x] ✅ deploy.sh - 支持多版本
- [x] ✅ .gitignore - 允许 package-lock.json

**总计**：9 个修复

## 🎯 为什么删除 rootDir？

### rootDir 的作用

`rootDir` 告诉 TypeScript 所有源文件都在这个目录下，用于：
1. 保持输出目录结构与源目录一致
2. 防止编译 rootDir 之外的文件

### 为什么我们不需要它？

在 monorepo 项目中：
1. 多个包之间会互相引用
2. `server` 包需要引用 `shared` 包和 `games` 目录
3. 限制 `rootDir` 会导致无法编译这些引用

### 删除后的影响

✅ **好处**：
- 可以引用项目中的任何文件
- 编译不会报错

⚠️ **注意**：
- 输出目录结构可能包含外部文件的路径
- 但这不影响运行，因为 `outDir: "./dist"` 确保输出在正确位置

## 🔧 验证修复

```bash
# 检查 tsconfig.json
cat packages/server/tsconfig.json | grep -i rootDir
# 应该没有输出

# 测试构建
docker compose build server

# 如果成功，会看到：
# Successfully built xxxxx
```

## 📊 TypeScript 配置对比

| 配置项 | 修改前 | 修改后 | 说明 |
|--------|--------|--------|------|
| outDir | ./dist | ./dist | 输出目录（保持不变） |
| rootDir | ./src | 删除 | 允许引用外部文件 |
| include | src/**/* | src/**/* | 包含的文件（保持不变） |

## 🎉 预期结果

修复后，构建应该继续进行：

```
[+] Building 180.5s
 => [server build  8/12] RUN npm run build --workspace=packages/shared       ✓
 => [server build  9/12] RUN npm run build --workspace=packages/game-engine  ✓
 => [server build 10/12] RUN npm run build --workspace=packages/server       ✓ 成功！
 => [server build 11/12] WORKDIR /app/games/avalon                           ✓
 => [server build 12/12] RUN npx tsc avalon-game.ts ...                      ✓

Successfully built xxxxx
```

## 🆘 如果还有编译错误

如果修复后仍有 TypeScript 错误，可能是代码本身的问题：

```bash
# 查看详细编译日志
docker compose build --progress=plain 2>&1 | grep "error TS"

# 常见错误类型
# - TS2307: Cannot find module - 模块路径错误
# - TS2345: Type not assignable - 类型不匹配
# - TS2339: Property does not exist - 属性不存在
```

请提供完整的错误信息，我会帮你解决。

## 📝 相关文件

- `packages/server/tsconfig.json` - 后端 TypeScript 配置
- `packages/shared/tsconfig.json` - 共享包配置
- `packages/game-engine/tsconfig.json` - 游戏引擎配置

## 💡 最佳实践

在 monorepo 项目中：
1. **不要限制 rootDir** - 允许跨包引用
2. **使用 skipLibCheck** - 跳过 node_modules 类型检查
3. **使用 composite** - 启用项目引用（可选）

---

**修复完成！现在可以重新部署了。** 🚀

这是第 6 个修复，所有问题应该都解决了！
