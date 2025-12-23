# 🚀 快速启动指南

## 第一次运行项目

### 1. 安装依赖（仅需一次）

```bash
# 在项目根目录
npm install

# 安装各个 package 的依赖
cd packages/server
npm install

cd ../client
npm install

cd ../..
```

### 2. 启动后端服务器

打开**第一个终端**：

```bash
cd packages/server
npm run dev
```

看到以下输出表示成功：

```
==================================================
Survival Narrative Game - Server
==================================================
Server running on port 3001
Health check: http://localhost:3001/health
Game API: http://localhost:3001/api/game
==================================================
```

### 3. 启动前端客户端

打开**第二个终端**：

```bash
cd packages/client
npm run dev
```

看到类似输出：

```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 4. 打开游戏

在浏览器访问：

```
http://localhost:3000/demo
```

---

## ✅ 验证系统正常工作

### 测试 1：后端健康检查

在浏览器访问：`http://localhost:3001/health`

应该看到：

```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

### 测试 2：LLM 接口测试

使用 curl 或 Postman 发送请求：

```bash
curl -X POST http://localhost:3001/api/game/step \
  -H "Content-Type: application/json" \
  -d '{
    "sceneId": "zone_01",
    "gameState": {
      "player": {
        "visible": {"health": 100, "stamina": 100, "supplies": 80},
        "inventory": [],
        "persistent": {"anomalousArtifacts": [], "deathCount": 0}
      },
      "turnCount": 0
    },
    "history": [],
    "runId": "test_001"
  }'
```

应该返回包含 `narrative` 和 `choices` 的 JSON。

### 测试 3：前端游戏界面

访问 `http://localhost:3000/demo`，应该能看到：

1. 标题屏幕："EXCLUSION ZONE"
2. "进入禁区" 按钮
3. 点击后看到叙事文本和 2-4 个选项

---

## 🎮 游戏操作

1. **点击"进入禁区"** - 初始化游戏，LLM 生成第一段叙事
2. **阅读叙事文本** - 了解当前环境和状态
3. **选择行动** - 点击选项卡，系统会：
   - 计算行动后果（数值变化）
   - 调用 LLM 生成新叙事
   - 更新界面
4. **继续探索** - 重复步骤 2-3
5. **死亡重生** - 如果生命值归零，可以选择重生

---

## 🔧 常见问题快速修复

### 问题 1：后端报错 "Cannot find module"

**解决**：

```bash
cd packages/server
npm install
npm run build
```

### 问题 2：前端显示空白页面

**解决**：

1. 打开浏览器控制台（F12）查看错误
2. 确认后端正在运行（`http://localhost:3001/health`）
3. 清除浏览器缓存并刷新

### 问题 3：CORS 错误

**症状**：浏览器控制台显示 "CORS policy blocked"

**解决**：检查 `packages/server/src/index.ts:20-25`，确认 CORS 配置包含前端端口。

### 问题 4：LLM 返回降级文本

**症状**：界面显示 "⚠ LLM 生成失败，使用降级文本"

**原因**：当前使用 Mock LLM，如果 schema 校验失败会降级。

**解决**：这是正常行为。查看后端日志了解详细错误。

---

## 📁 关键文件位置

### 游戏配置

- **场景数据**：`scenes/zone_01/scene.json`
- **背景图**：`scenes/zone_01/background.jpg`
- **道具数据**：`scenes/zone_01/items.json`

### Prompt 系统

- **模板文件**：`prompts/templates/scene_and_choices.prompt.md`
- **输入 Schema**：`prompts/schemas/llm_input.schema.json`
- **输出 Schema**：`prompts/schemas/llm_output.schema.json`

### 前端界面

- **LLM 游戏 UI**：`packages/client/src/components/LLMGameUI.tsx`
- **API 客户端**：`packages/client/src/services/llm-game-api.ts`
- **样式文件**：`packages/client/src/components/LLMGameUI.css`

### 后端服务

- **主路由**：`packages/server/src/routes/game-routes.ts`
- **步骤控制器**：`packages/server/src/services/game-step-controller.ts`
- **LLM 客户端**：`packages/server/src/services/llm-client.ts`

---

## 🎯 下一步

1. **阅读完整文档**：`STAGE4_MANUAL.md`
2. **创建新场景**：参考 `scenes/SCENE_TEMPLATE.md`
3. **接入真实 LLM**：修改 `llm-client.ts` 配置 OpenAI/Anthropic API
4. **自定义 Prompt**：编辑 `prompts/templates/scene_and_choices.prompt.md`

---

## 💡 提示

- **开发模式**：代码修改会自动热重载（前端和后端）
- **日志调试**：后端终端会显示详细的 LLM 调用日志
- **强制刷新**：如果界面没更新，按 `Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）

祝游戏开发顺利！ 🎮
