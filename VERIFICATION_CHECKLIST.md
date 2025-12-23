# 第四阶段验证清单

使用本清单验证系统是否正确实现。

---

## 📁 文件结构检查

### ✅ 后端服务层（必需）

- [ ] `packages/server/src/services/scene-loader.ts` - 场景加载器
- [ ] `packages/server/src/services/context-builder.ts` - 上下文构造器
- [ ] `packages/server/src/services/prompt-renderer.ts` - Prompt 渲染器
- [ ] `packages/server/src/services/llm-client.ts` - LLM 客户端
- [ ] `packages/server/src/services/schema-validator.ts` - Schema 校验器
- [ ] `packages/server/src/services/game-step-controller.ts` - 游戏步骤控制器

### ✅ Prompt 系统（必需）

- [ ] `prompts/templates/scene_and_choices.prompt.md` - Prompt 模板
- [ ] `prompts/schemas/llm_input.schema.json` - 输入 schema
- [ ] `prompts/schemas/llm_output.schema.json` - 输出 schema
- [ ] `prompts/README.md` - Prompt 系统说明

### ✅ 场景系统（至少有 zone_01）

- [ ] `scenes/zone_01/scene.json` - 场景数据
- [ ] `scenes/zone_01/items.json` - 道具数据（可选）
- [ ] `scenes/SCENE_TEMPLATE.md` - 场景模板

### ✅ 前端界面（必需）

- [ ] `packages/client/src/components/LLMGameUI.tsx` - LLM 游戏 UI
- [ ] `packages/client/src/components/LLMGameUI.css` - 样式文件
- [ ] `packages/client/src/services/llm-game-api.ts` - API 客户端
- [ ] `packages/client/src/pages/SceneDemo/SceneDemoPage.tsx` - 已更新使用 LLMGameUI

### ✅ 共享类型（必需）

- [ ] `packages/shared/src/types/llm.ts` - LLM 类型定义
- [ ] `packages/shared/src/types/scene.ts` - 场景类型定义
- [ ] `packages/shared/src/index.ts` - 导出 llm 和 scene 类型

### ✅ 文档（必需）

- [ ] `STAGE4_MANUAL.md` - 完整操作手册
- [ ] `QUICKSTART.md` - 快速启动指南
- [ ] `STAGE4_SUMMARY.md` - 实现总结
- [ ] `VERIFICATION_CHECKLIST.md` - 本文件

---

## 🔧 功能验证

### 1️⃣ 后端服务启动

```bash
cd packages/server
npm install
npm run dev
```

**预期输出**：
```
==================================================
Survival Narrative Game - Server
==================================================
Server running on port 3001
...
```

**验证**：
- [ ] 后端启动无错误
- [ ] 访问 `http://localhost:3001/health` 返回 200 OK

---

### 2️⃣ 场景加载测试

**方法 1：直接 API 调用**

```bash
curl http://localhost:3001/api/game/stats
```

**预期输出**：
```json
{
  "success": true,
  "data": {
    "activeSessions": 0,
    "llmAvailable": true
  }
}
```

**验证**：
- [ ] 返回成功
- [ ] `llmAvailable` 为 true

---

### 3️⃣ LLM 接口测试

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

**预期输出** （JSON 格式）：
```json
{
  "success": true,
  "data": {
    "narrative": "你站在禁区边缘，...",
    "narrativeSource": "environment",
    "choices": [
      {
        "id": "choice_1",
        "text": "继续向前，...",
        "riskHint": "体力可能下降"
      },
      ...
    ],
    "tags": ["exploration", "anomaly_hint"],
    "background": "/scenes/zone_01/background.jpg",
    "backgroundFallback": "#0b0f14",
    "sceneInfo": {
      "sceneId": "zone_01",
      "name": "未知禁区入口",
      "dangerLevel": 2
    },
    "meta": {
      "usedFallback": false
    }
  }
}
```

**验证清单**：
- [ ] 返回 `success: true`
- [ ] 包含 `narrative` 字段（非空字符串）
- [ ] 包含 2-4 个 `choices`
- [ ] 每个 choice 有 `id`, `text`, `riskHint`
- [ ] 包含 `sceneInfo`（场景名称、危险等级）
- [ ] `meta.usedFallback` 为 false（Mock LLM 正常工作）

---

### 4️⃣ 前端服务启动

```bash
cd packages/client
npm install
npm run dev
```

**预期输出**：
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:3000/
```

**验证**：
- [ ] 前端启动无错误
- [ ] 浏览器访问 `http://localhost:3000/demo` 可以打开

---

### 5️⃣ 前端界面功能

**访问**：`http://localhost:3000/demo`

#### 5.1 标题屏幕
- [ ] 显示 "EXCLUSION ZONE" 标题
- [ ] 显示 "LLM 叙事生成系统 - 技术演示" 副标题
- [ ] 显示 "进入禁区" 按钮
- [ ] 点击按钮后加载游戏

#### 5.2 游戏界面（点击"进入禁区"后）
- [ ] 顶部 HUD 显示：生命、体力、补给数值
- [ ] 顶部右侧显示：场景名称、步骤数
- [ ] 显示叙事文本（来自 LLM）
- [ ] 显示 2-4 个选项卡
- [ ] 每个选项卡包含：行动描述 + 风险提示
- [ ] 背景为纯色（或背景图，如果已添加）

#### 5.3 选项交互
- [ ] 点击选项后显示 "LLM 生成中..." 加载状态
- [ ] 加载完成后更新叙事文本
- [ ] 更新选项列表（新的选项）
- [ ] 步骤计数器递增
- [ ] 数值可能变化（生命/体力/补给）

#### 5.4 死亡与重生（可选测试）
- [ ] 如果生命值归零，显示 "生命终结" 屏幕
- [ ] 显示死亡次数
- [ ] "重生" 按钮可以复活
- [ ] "返回主菜单" 按钮返回标题屏幕

#### 5.5 调试信息
- [ ] 底部显示 runId、步骤数、死亡次数
- [ ] 如果使用降级叙事，显示 `[FALLBACK]` 标记

---

### 6️⃣ Schema 校验测试

**测试方法**：发送错误格式的 LLM 输出

修改 `packages/server/src/services/llm-client.ts:64-89`，临时返回错误格式：

```typescript
const output: LLMOutput = {
  narrative: {
    text: "短文本",  // ← 太短，应该 >= 10 字符
    source: "invalid_source"  // ← 无效来源
  },
  choices: [
    {
      id: "invalid_id",  // ← 格式错误，应该是 choice_N
      text: "选项",
      riskHint: "风险"
    }
  ],
  tags: []  // ← 太少，应该 1-3 个
};
```

**预期行为**：
- [ ] 后端日志显示 schema 校验错误
- [ ] 前端显示 "⚠ LLM 生成失败，使用降级文本"
- [ ] 游戏可以继续（使用 fallback）

**恢复**：改回正确格式

---

### 7️⃣ 端到端流程验证

完整游玩 3-5 步，验证：

- [ ] **步骤 1**：初始化 → 显示第一段叙事 + 选项
- [ ] **步骤 2**：选择选项 → 显示新叙事 + 新选项
- [ ] **步骤 3**：继续选择 → 叙事保持连贯性
- [ ] **步骤 4**：数值变化 → 生命/体力/补给正常更新
- [ ] **步骤 5**：历史记录 → 底部调试信息正确显示步骤数

---

## 🐛 常见问题排查

### ❌ 问题 1：后端报错 "Cannot find module"

**检查**：
- [ ] 运行 `npm install` 安装依赖
- [ ] 检查 `packages/shared/src/index.ts` 是否导出 llm 和 scene 类型

**解决**：
```bash
cd packages/shared
npm run build

cd ../server
npm install
```

---

### ❌ 问题 2：前端显示空白页面

**检查**：
- [ ] 浏览器控制台（F12）是否有错误
- [ ] 后端是否正在运行（`http://localhost:3001/health`）
- [ ] CORS 配置是否正确

**解决**：
1. 清除浏览器缓存（Ctrl + Shift + R）
2. 确认后端运行在 3001 端口
3. 检查 `packages/server/src/index.ts:20-25` CORS 配置

---

### ❌ 问题 3：LLM 返回降级文本

**检查**：
- [ ] 后端日志中的 schema 校验错误
- [ ] Mock LLM 输出格式是否正确

**正常情况**：
- Mock LLM 应该返回格式正确的输出
- 如果看到 fallback，检查 `llm-client.ts:56-96`

---

### ❌ 问题 4：背景图不显示

**检查**：
- [ ] `scenes/zone_01/background.jpg` 是否存在
- [ ] 后端静态文件服务是否启动
- [ ] 浏览器网络请求（F12 → Network）是否有 404

**解决**：
1. 如果没有背景图，会显示纯色背景（正常）
2. 添加背景图到 `scenes/zone_01/background.jpg`
3. 重启后端服务

---

## ✅ 最终验收

所有以下项必须通过：

### 核心功能
- [ ] 后端服务正常启动
- [ ] 前端服务正常启动
- [ ] 访问 `/demo` 可以进入游戏
- [ ] LLM 接口返回正确格式的数据
- [ ] 点击选项后可以进入下一步

### 架构实现
- [ ] 场景系统已实现（SceneLoader）
- [ ] Prompt 模板系统已实现（PromptRenderer）
- [ ] 上下文构造系统已实现（ContextBuilder）
- [ ] LLM 客户端已实现（Mock 模式）
- [ ] Schema 校验已实现（SchemaValidator）

### 文档完整性
- [ ] STAGE4_MANUAL.md 包含完整操作说明
- [ ] QUICKSTART.md 提供快速启动步骤
- [ ] SCENE_TEMPLATE.md 提供场景创建模板

---

## 🎯 通过标准

**最低要求**：
- 所有"核心功能"检查项通过
- 所有"架构实现"检查项通过
- 可以完整游玩至少 3 个步骤

**理想状态**：
- 所有检查项通过
- 无 TypeScript 编译错误
- 无运行时错误
- 降级策略正常工作

---

## 📊 验证记录

**验证人**：___________

**验证日期**：___________

**结果**：[ ] 通过 / [ ] 未通过

**备注**：
```
（记录遇到的问题和解决方案）
```

---

**恭喜！如果所有检查项都通过，第四阶段已成功实现。** 🎉
