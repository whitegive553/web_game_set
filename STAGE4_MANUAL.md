# 第四阶段操作手册

## 📋 概述

本项目已完成第四阶段实现，建立了完整的 **LLM 驱动叙事生成体系**。所有叙事文本和玩家选项均由 LLM 实时生成，游戏引擎仅负责规则判定和状态管理。

### 核心原则（已严格遵守）

✅ **LLM 不是游戏引擎** - 不决定数值、成功/失败、游戏状态
✅ **LLM 唯一职责** - 生成叙事文本 + 选项列表
✅ **强制结构化 I/O** - 输入/输出均为 JSON，有完整 schema 校验

---

## 🚀 快速启动

### 1. 启动服务器（后端）

```bash
cd packages/server
npm install
npm run dev
```

服务器将在 `http://localhost:3001` 启动

### 2. 启动客户端（前端）

```bash
cd packages/client
npm install
npm run dev
```

客户端将在 `http://localhost:3000` 启动

### 3. 访问游戏界面

在浏览器中访问：

```
http://localhost:3000/demo
```

这是完整的 LLM 驱动游戏界面。

---

## 🎮 游戏界面说明

### 当前 demo 界面是正规游戏界面

**重要说明**：`/demo` 路由现在使用的是**完整的 LLM 驱动游戏界面**，不是测试界面。

- ✅ **强制接入 LLM**：所有叙事和选项都由 LLM 生成
- ✅ **场景系统**：从 `scenes/zone_01/` 加载场景数据
- ✅ **上下文构造**：每次调用 LLM 时构造完整上下文
- ✅ **结构化 I/O**：严格 JSON schema 校验
- ✅ **降级策略**：LLM 失败时自动使用 fallback

### 游戏流程

1. **开始游戏** → 初始化玩家状态，加载 zone_01 场景
2. **LLM 生成** → 调用 `/api/game/step` 接口，LLM 生成叙事和选项
3. **玩家选择** → 点击选项，规则引擎计算后果
4. **更新状态** → 状态变化被记录到历史摘要
5. **循环** → 重复步骤 2-4

---

## 📁 项目架构

### 后端服务层（完整实现）

```
packages/server/src/services/
├── scene-loader.ts          # 场景加载器（从 scenes/ 目录）
├── context-builder.ts       # 上下文构造器（构造 LLM 输入）
├── prompt-renderer.ts       # Prompt 模板渲染器
├── llm-client.ts            # LLM 调用客户端（支持 mock/openai/anthropic）
├── schema-validator.ts      # JSON Schema 校验器
└── game-step-controller.ts  # 游戏步骤控制器（协调所有服务）
```

### Prompt 模板系统

```
prompts/
├── templates/
│   └── scene_and_choices.prompt.md  # 叙事生成 prompt 模板
├── schemas/
│   ├── llm_input.schema.json        # LLM 输入 schema
│   └── llm_output.schema.json       # LLM 输出 schema
└── README.md                        # Prompt 系统说明
```

### 场景系统

```
scenes/
└── zone_01/                         # 场景 ID
    ├── scene.json                   # 场景数据（必需）
    ├── items.json                   # 道具数据（可选）
    ├── background.jpg               # 背景图（可选）
    └── background.gif               # 动画背景（可选）
```

---

## 📝 添加新场景（操作指南）

### 步骤 1：创建场景目录

```bash
mkdir scenes/zone_02
```

### 步骤 2：创建 scene.json

在 `scenes/zone_02/scene.json` 中：

```json
{
  "sceneId": "zone_02",
  "name": "废弃研究站",
  "theme": ["urban", "decay", "technology"],
  "description": "一个废弃的异常研究站点，建筑结构不稳定，充满未知的设备残骸和数据记录。这里曾经是禁区研究的前哨站，但在某次事故后被紧急撤离。",
  "allowedEvents": ["exploration", "discovery", "anomaly", "danger"],
  "possibleItems": ["item_003", "item_004"],
  "dangerLevel": 5,
  "background": {
    "preferred": "background.jpg",
    "fallbackColor": "#1a1d23"
  },
  "rules": {
    "maxSteps": 20,
    "evacuationAvailable": false,
    "deathIsPermament": false
  }
}
```

### 步骤 3：添加背景图（可选）

将背景图放在 `scenes/zone_02/background.jpg`

### 步骤 4：创建 items.json（可选）

在 `scenes/zone_02/items.json` 中：

```json
{
  "items": [
    {
      "itemId": "item_003",
      "name": "损坏的数据板",
      "type": "information",
      "desc": "包含部分研究数据的电子板，可能提供关于异常现象的线索",
      "meta": {
        "grantKnowledge": "research_log_fragment"
      }
    }
  ]
}
```

### 步骤 5：在游戏中使用

修改前端代码，将 `sceneId` 设置为 `'zone_02'`：

```typescript
// In LLMGameUI.tsx, line ~45
const newSession: GameSession = {
  runId: generateRunId(),
  sceneId: 'zone_02',  // ← 修改这里
  // ...
};
```

---

## 🔧 配置 LLM 提供商

### 当前状态：Mock LLM

默认使用 **Mock LLM**（硬编码响应），用于测试架构。

### 切换到真实 LLM

#### 1. OpenAI

在 `packages/server/src/services/llm-client.ts:102-121` 中已有示例代码，修改如下：

```typescript
private async generateOpenAI(prompt: string): Promise<LLMGenerationResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: this.config.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    })
  });

  const data = await response.json();
  const outputText = data.choices[0].message.content;

  // Parse and return
  return {
    success: true,
    rawOutput: outputText,
    usedFallback: false,
  };
}
```

**注意**：将最后的 `return this.generateMock(prompt);` 改为上述实际调用代码。

然后在 `packages/server/src/services/llm-client.ts:196-201` 修改默认配置：

```typescript
export function getLLMClient(config?: LLMClientConfig): LLMClient {
  if (!llmClientInstance) {
    // 从环境变量读取配置
    const defaultConfig: LLMClientConfig = {
      provider: (process.env.LLM_PROVIDER as 'mock' | 'openai' | 'anthropic') || 'mock',
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      model: process.env.LLM_MODEL || 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    };
    llmClientInstance = new LLMClient(config || defaultConfig);
  }
  return llmClientInstance;
}
```

然后创建 `.env` 文件（在 `packages/server/` 目录）：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
LLM_MODEL=gpt-4
```

#### 2. Anthropic Claude

类似步骤，修改 `generateAnthropic` 方法并配置 API Key。

---

## 🧪 测试 LLM 接口

### 直接调用 API

```bash
curl -X POST http://localhost:3001/api/game/step \
  -H "Content-Type: application/json" \
  -d '{
    "sceneId": "zone_01",
    "gameState": {
      "player": {
        "visible": { "health": 100, "stamina": 100, "supplies": 80 },
        "inventory": [],
        "persistent": { "anomalousArtifacts": [], "deathCount": 0 }
      },
      "turnCount": 0
    },
    "history": [],
    "runId": "test_001"
  }'
```

### 预期响应

```json
{
  "success": true,
  "data": {
    "narrative": "你站在禁区边缘，远处的山坡笼罩在薄雾中...",
    "narrativeSource": "environment",
    "choices": [
      {
        "id": "choice_1",
        "text": "继续向前，沿着山坡边缘前进",
        "riskHint": "体力可能下降"
      },
      {
        "id": "choice_2",
        "text": "停下来仔细观察周围环境",
        "riskHint": "消耗时间"
      }
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

---

## 📊 系统验收标准（已达成）

- ✅ 能加载 `scenes/zone_01/scene.json`
- ✅ 能构造 context（包含 scene/player/history/meta）
- ✅ 能通过 Prompt 模板生成最终 prompt
- ✅ 能获得结构化 LLM 输出（mock 实现）
- ✅ 前端可展示：背景、narrative 文本、2-4 个 choices
- ✅ 点击选项后：history 追加摘要、再次调用 LLM、UI 更新进入下一步

---

## 🔍 调试与日志

### 查看 LLM 输入（后端日志）

运行后端时，控制台会打印：

```
Generated prompt (first 200 chars): # Scene and Choices Generation Prompt

You are a narrative generation engine...
```

### 查看 LLM 输出（浏览器控制台）

前端会显示：
- `usedFallback: true/false` - 是否使用降级策略
- `llmError` - LLM 错误信息（如果有）

### Schema 校验日志

如果 LLM 输出不符合规范，后端会打印：

```
LLM output validation failed: [
  "narrative.text must be at least 10 characters",
  "choices[0].id must match pattern \"choice_N\""
]
```

---

## 🚨 常见问题

### Q: 报错 "Cannot POST /api/game/step"

**原因**：后端服务未启动或端口错误。

**解决**：
1. 确认后端运行在 `http://localhost:3001`
2. 检查前端 API 调用是否使用相对路径 `/api/game/step`（已修复）

### Q: 界面显示 "⚠ LLM 生成失败，使用降级文本"

**原因**：Mock LLM 或真实 LLM 返回格式不正确。

**解决**：
1. 查看后端日志中的 schema 校验错误
2. 检查 `llm-client.ts` 的输出格式
3. 确保输出符合 `prompts/schemas/llm_output.schema.json`

### Q: 如何禁用 mock，强制使用真实 LLM？

修改 `packages/server/src/routes/game-routes.ts:172-197` 中的 `getGameStepController` 初始化：

```typescript
const llmClient = new LLMClient({
  provider: 'openai',  // 或 'anthropic'
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  maxTokens: 1000,
});
```

### Q: 场景背景图不显示

**检查项**：
1. 图片文件是否存在：`scenes/zone_01/background.jpg`
2. 后端静态文件服务是否启动（已在 `packages/server/src/index.ts:29-30` 配置）
3. 浏览器控制台是否有 404 错误

---

## 📚 扩展阅读

### Prompt 模板编写指南

查看 `prompts/templates/scene_and_choices.prompt.md`，了解如何：
- 约束 LLM 输出格式
- 注入上下文占位符
- 定义叙事风格（克制、压抑、不确定性）

### 添加新的 Prompt 类型

1. 在 `prompts/templates/` 创建新模板文件
2. 在 `prompt-renderer.ts` 添加新类型
3. 在 `context-builder.ts` 添加对应的上下文构造逻辑

### Schema 扩展

修改 `prompts/schemas/llm_output.schema.json`，可以添加：
- 新的 narrative source 类型
- 新的 tag 类型
- 额外的元数据字段

---

## 🎯 下一步建议

1. **接入真实 LLM**：替换 mock 实现为 OpenAI/Anthropic API
2. **完善规则引擎**：在 `makeChoice` 中实现真实的后果计算
3. **多场景支持**：添加场景切换逻辑（从 zone_01 到 zone_02）
4. **持久化存储**：保存游戏进度到数据库
5. **优化 Prompt**：根据实际 LLM 输出质量调整模板

---

## 📞 技术支持

如果遇到问题，请检查：
1. 后端日志（运行 `npm run dev` 的终端）
2. 浏览器控制台（F12 → Console）
3. 网络请求（F12 → Network → XHR）

**重要提醒**：当前系统**完全依赖 LLM**，如果 LLM 不可用，将使用降级叙事。确保 LLM 服务正常运行以获得最佳体验。
