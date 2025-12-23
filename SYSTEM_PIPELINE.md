# 系统 Pipeline 完整说明

## 概述

这是一个 **完全由 LLM 驱动的叙事游戏系统**。每一步的叙事文本和玩家选项都由 LLM 实时生成，历史信息会在每次调用时传递给 LLM。

---

## 完整流程图

```
前端 (LLMGameUI.tsx)
  ↓
  调用 POST /api/game/step
  ↓
后端 (game-routes.ts)
  ↓
GameStepController.generateStep()
  ↓
  1. SceneLoader: 加载场景数据 (scene.json)
  2. ContextBuilder: 构造 LLM 上下文
     - scene: 场景信息 (zone_01)
     - player: 玩家状态 (health, stamina, inventory)
     - history: 历史记录 (最近 8 条)
     - meta: 元信息 (step, runId, deathCount)
  3. PromptRenderer: 渲染 prompt 模板
     - 注入上下文 JSON
     - 注入约束条件
  4. LLMClient: 调用 OpenAI/Anthropic API
     - 发送 prompt
     - 接收 rawOutput (JSON 字符串)
  5. SchemaValidator: 解析和校验输出
     - 移除代码块标记 (```json)
     - JSON.parse()
     - 校验字段 (narrative, choices, tags)
  6. 返回结构化数据
  ↓
前端接收并渲染
  - 显示 narrative 文本
  - 显示 2-4 个 choices
  - 玩家点击选项
  ↓
前端记录到 history
  - step: 步骤编号
  - choiceId: 选择的 ID
  - choiceText: 选择的文本
  - outcome.summary: 结果摘要 (目前简化为选择的文本)
  ↓
重复流程（带着新的 history）
```

---

## 详细步骤说明

### 第 1 步：前端请求 (LLMGameUI.tsx)

**触发时机**：
- 游戏开始时（step 0）
- 玩家点击选项后（step N）

**请求数据**：
```typescript
{
  sceneId: "zone_01",
  gameState: {
    player: {
      visible: { health: 100, stamina: 100, supplies: 80 },
      inventory: [],
      persistent: { anomalousArtifacts: [], deathCount: 0 }
    },
    turnCount: 0 // 当前步骤编号
  },
  history: [
    // 从第二步开始，会包含历史记录
    {
      step: 0,
      eventId: "step_0",
      choiceId: "choice_1",
      choiceText: "继续向前探索",
      outcome: { summary: "你选择了继续向前探索" }
    }
  ],
  runId: "run_1234567890"
}
```

**关键点**：
- `history` 数组包含之前所有步骤的选择和结果
- 第一次请求时 `history` 为空数组
- 每次请求后，前端会追加新的历史记录

---

### 第 2 步：场景加载 (SceneLoader)

**文件路径**：`scenes/zone_01/scene.json`

**加载内容**：
```json
{
  "sceneId": "zone_01",
  "name": "未知禁区入口",
  "theme": ["mountain", "abnormal", "isolation"],
  "dangerLevel": 2,
  "description": "这是进入异常禁区的第一个检查点区域...",
  "allowedEvents": ["exploration", "encounter", "anomaly"],
  "possibleItems": ["item_001", "item_002"],
  "background": {
    "preferred": "background.jpg",
    "fallbackColor": "#0b0f14"
  }
}
```

**用途**：
- 提供场景主题和氛围
- 告诉 LLM 当前环境的特征
- 设置危险等级（影响 LLM 生成的紧张度）

---

### 第 3 步：上下文构造 (ContextBuilder)

**输入**：gameState + scene + history

**输出**：LLMGenerationContext
```json
{
  "scene": {
    "sceneId": "zone_01",
    "name": "未知禁区入口",
    "theme": ["mountain", "abnormal", "isolation"],
    "dangerLevel": 2
  },
  "player": {
    "visibleState": {
      "health": 100,
      "stamina": 100,
      "hunger": 80,
      "water": 80
    },
    "inventorySummary": [],
    "vaultSummary": []
  },
  "history": [
    {
      "step": 0,
      "eventId": "step_0",
      "choiceId": "choice_1",
      "choiceText": "继续向前探索",
      "consequenceSummary": "你选择了继续向前探索"
    },
    {
      "step": 1,
      "eventId": "step_1",
      "choiceId": "choice_2",
      "choiceText": "仔细观察周围",
      "consequenceSummary": "你选择了仔细观察周围"
    }
    // ... 最多保留最近 8 条
  ],
  "meta": {
    "step": 2,
    "failureCount": 0,
    "runId": "run_1234567890",
    "timezone": "local"
  }
}
```

**关键逻辑**：
- **历史记录限制**：只保留最近 8 条，避免 prompt 过长
- **状态映射**：将游戏的 `supplies` 映射为 LLM 的 `hunger` 和 `water`
- **步骤追踪**：`meta.step` 告诉 LLM 当前是第几步（用于调整叙事节奏）

**代码位置**：`packages/server/src/services/context-builder.ts:62-77`

---

### 第 4 步：Prompt 渲染 (PromptRenderer)

**模板文件**：`prompts/templates/scene_and_choices.prompt.md`

**占位符替换**：
- `{{CONTEXT_JSON}}` → 上一步构造的完整上下文
- `{{CONSTRAINTS_JSON}}` → 约束条件（minChoices, maxChoices, tone, language）

**最终 Prompt 示例**：
```markdown
# Scene and Choices Generation Prompt

You are a narrative generation engine...

## Input Context

{
  "scene": { "sceneId": "zone_01", "name": "未知禁区入口", ... },
  "player": { "visibleState": { "health": 100, ... }, ... },
  "history": [ ... ],
  "meta": { "step": 2, ... }
}

## Constraints

{
  "minChoices": 2,
  "maxChoices": 4,
  "tone": "cold_and_uncertain",
  "language": "zh-CN",
  "noDirectOutcome": true
}

## Output Format

You MUST respond with ONLY a valid JSON object...
```

**代码位置**：`packages/server/src/services/prompt-renderer.ts:23-48`

---

### 第 5 步：LLM 调用 (LLMClient)

**提供商选择**：
- **Mock**：硬编码响应（测试用）
- **OpenAI**：调用 GPT-4 API
- **Anthropic**：调用 Claude API

**OpenAI API 请求**：
```typescript
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-4",
  "messages": [{ "role": "user", "content": "<上一步的 prompt>" }],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**OpenAI API 响应**：
```json
{
  "choices": [
    {
      "message": {
        "content": "{\"narrative\":{\"text\":\"风沿着山坡边缘吹过...\",\"source\":\"environment\"},\"choices\":[...],\"tags\":[...]}"
      }
    }
  ]
}
```

**LLMClient 返回**：
```typescript
{
  success: true,
  rawOutput: "{\"narrative\":{...},\"choices\":[...],\"tags\":[...]}",
  usedFallback: false
}
```

**代码位置**：`packages/server/src/services/llm-client.ts:108-153`

---

### 第 6 步：解析和校验 (SchemaValidator)

**输入**：rawOutput (JSON 字符串)

**处理步骤**：
1. 移除代码块标记（如果有）：
   ```typescript
   if (cleaned.startsWith('```json')) {
     cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
   }
   ```

2. JSON.parse() 解析

3. 校验字段：
   - `narrative.text`: 10-1000 字符
   - `narrative.source`: 必须是 "environment" / "character" / "system"
   - `choices`: 2-4 个选项
   - `choices[].id`: 必须匹配 "choice_N" 格式
   - `choices[].text`: 5-200 字符
   - `choices[].riskHint`: 3-100 字符
   - `tags`: 1-3 个有效标签

**输出**：
```typescript
{
  success: true,
  output: {
    narrative: {
      text: "风沿着山坡边缘吹过，带起一层薄薄的尘雾...",
      source: "environment"
    },
    choices: [
      { id: "choice_1", text: "继续向前探索", riskHint: "体力可能下降" },
      { id: "choice_2", text: "仔细观察周围", riskHint: "消耗时间" }
    ],
    tags: ["exploration", "anomaly_hint"]
  },
  errors: []
}
```

**代码位置**：`packages/server/src/services/schema-validator.ts:256-300`

---

### 第 7 步：返回前端

**GameStepController 输出**：
```typescript
{
  narrative: "风沿着山坡边缘吹过，带起一层薄薄的尘雾...",
  narrativeSource: "environment",
  choices: [
    { id: "choice_1", text: "继续向前探索", riskHint: "体力可能下降" },
    { id: "choice_2", text: "仔细观察周围", riskHint: "消耗时间" }
  ],
  tags: ["exploration", "anomaly_hint"],
  background: "/scenes/zone_01/background.jpg",
  backgroundFallback: "#0b0f14",
  sceneInfo: {
    sceneId: "zone_01",
    name: "未知禁区入口",
    dangerLevel: 2
  },
  meta: {
    usedFallback: false
  }
}
```

**前端渲染**：
1. 显示 `narrative` 文本
2. 渲染 `choices` 为可点击的卡片
3. 加载 `background` 背景图
4. 显示 `sceneInfo` (场景名称、危险等级)

**代码位置**：`packages/client/src/components/LLMGameUI.tsx:180-210`

---

### 第 8 步：玩家选择 → 更新 history

**玩家操作**：点击 "继续向前探索"

**前端更新 history**：
```typescript
const newHistoryEntry = {
  step: sessionData.step,
  eventId: `step_${sessionData.step}`,
  choiceId: choice.id,          // "choice_1"
  choiceText: choice.text,       // "继续向前探索"
  outcome: {
    summary: `你选择了${choice.text}` // "你选择了继续向前探索"
  }
};

sessionData.history.push(newHistoryEntry);
sessionData.step += 1;
```

**重要**：
- **目前 `outcome.summary` 是简化的**，只是重复了选择的文本
- **未来可以扩展**：由规则引擎计算实际结果（如体力 -10）
- **LLM 会看到这些 summary**，用于生成下一步的叙事

**代码位置**：`packages/client/src/components/LLMGameUI.tsx:134-153`

---

### 第 9 步：循环（带着新的 history）

**下一次请求**：
```typescript
{
  sceneId: "zone_01",
  gameState: { ... },
  history: [
    {
      step: 0,
      choiceId: "choice_1",
      choiceText: "继续向前探索",
      outcome: { summary: "你选择了继续向前探索" }
    }
    // 这次请求会包含上一步的选择
  ],
  runId: "run_1234567890"
}
```

**LLM 会看到历史**：
- 知道玩家之前选择了"继续向前探索"
- 可以生成连贯的叙事："在前进的过程中，你注意到..."
- 避免重复相同的场景描述

---

## 历史信息整合验证

### ✅ 是的，每次都会传递完整历史

**证据 1**：`context-builder.ts:132-142`
```typescript
private buildHistoryContext(history: GameHistoryEntry[]): LLMHistoryEntry[] {
  // 保留最近 8 条
  const recentHistory = history.slice(-this.MAX_HISTORY_ENTRIES);

  return recentHistory.map(entry => ({
    step: entry.step,
    eventId: entry.eventId,
    choiceId: entry.choiceId,
    choiceText: entry.choiceText,
    consequenceSummary: entry.outcome.summary,
  }));
}
```

**证据 2**：`LLMGameUI.tsx:134-153`
```typescript
// 玩家选择后，立即追加到 history
const newHistoryEntry = {
  step: sessionData.step,
  eventId: `step_${sessionData.step}`,
  choiceId: choice.id,
  choiceText: choice.text,
  outcome: { summary: `你选择了${choice.text}` }
};

sessionData.history.push(newHistoryEntry);
```

**证据 3**：Prompt 模板会注入历史
```markdown
## Input Context

{
  ...
  "history": [
    { "step": 0, "choiceText": "继续向前探索", "consequenceSummary": "..." },
    { "step": 1, "choiceText": "仔细观察周围", "consequenceSummary": "..." }
  ],
  ...
}
```

### ✅ LLM 会基于历史生成连贯叙事

**Prompt 指令**：
```
## Context Integration

3. **History**: Review `history` entries to maintain narrative continuity and avoid repetition
```

**示例**：
- 第 0 步：LLM 生成 "你站在禁区边缘..."
- 玩家选择 "继续向前"
- 第 1 步：LLM 看到历史，生成 "在前进的过程中，你注意到..."（连贯）
- 玩家选择 "停下观察"
- 第 2 步：LLM 看到历史，生成 "你停下脚步，仔细观察..."（连贯）

---

## Scene 配置是否满足要求？

### 当前 scene.json 分析

**文件**：`scenes/zone_01/scene.json`

**内容**：
```json
{
  "sceneId": "zone_01",
  "name": "未知禁区入口",
  "theme": ["mountain", "abnormal", "isolation"],
  "description": "这是进入异常禁区的第一个检查点区域。地形以低矮的山坡和干燥的碎石地为主...",
  "dangerLevel": 2,
  "allowedEvents": ["exploration", "encounter", "anomaly"],
  "possibleItems": ["item_001", "item_002"],
  "background": { "preferred": "background.jpg", "fallbackColor": "#0b0f14" },
  "rules": { "maxSteps": 15, "evacuationAvailable": true, "deathIsPermament": false }
}
```

### ✅ 满足要求

1. **sceneId** ✅: 唯一标识符
2. **name** ✅: 显示在 UI 上
3. **theme** ✅: 传递给 LLM，影响叙事风格
4. **description** ✅: 详细描述（虽然目前未直接传给 LLM，但可以在未来版本使用）
5. **dangerLevel** ✅: 传递给 LLM，影响紧张度
6. **background** ✅: 前端显示背景图

### ⚠️ 潜在改进点

1. **description 未传给 LLM**：
   - 当前只传了 `sceneId`, `name`, `theme`, `dangerLevel`
   - `description` 字段很详细，但未使用
   - **建议**：在 `context-builder.ts` 中也传递 `description` 给 LLM

2. **allowedEvents 和 possibleItems 未使用**：
   - 这些字段存在但未传给 LLM
   - **建议**：可以扩展 prompt，告诉 LLM 可以生成哪些事件类型

3. **rules 未强制执行**：
   - `maxSteps: 15` 未在系统中检查
   - **建议**：在 `game-step-controller.ts` 中检查步数限制

---

## 降级策略

### 三级 Fallback

1. **Mock LLM**：硬编码的中文响应
2. **Generic Fallback**：基于 scene 数据生成通用叙事
3. **Absolute Fallback**：连 scene 都加载失败时的兜底

**代码位置**：
- Mock: `llm-client.ts:62-97`
- Generic: `game-step-controller.ts:174-219`
- Absolute: `game-step-controller.ts:224-253`

---

## 当前系统状态总结

### ✅ 已完成
1. 完整的 LLM pipeline
2. 历史信息正确传递和整合
3. Scene 加载和上下文构造
4. OpenAI/Anthropic API 集成
5. JSON schema 校验
6. 降级策略

### ⚠️ 需要改进
1. **outcome.summary 太简化**：目前只是重复选择文本，应该由规则引擎计算实际结果
2. **scene.description 未使用**：可以传给 LLM 增强上下文
3. **规则未强制执行**：maxSteps, evacuationAvailable 等未检查
4. **无流式输出**：玩家需要等待整个响应完成

---

## 下一步计划

1. ✅ 修复 OpenAI 响应解析 bug（已完成）
2. ✅ 优化 Prompt 模板（已完成）
3. ⏳ 实现流式输出（下一步）
4. ⏳ 扩展 scene context（传递 description）
5. ⏳ 实现规则引擎计算真实 outcome
