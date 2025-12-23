# 类型名称变更说明

## 为什么修改类型名称？

为了避免与旧系统（`types/core.ts`）的类型冲突，Phase 4 的 LLM 相关类型已重命名。

---

## 类型映射表

| 文档中的旧名称 | 实际代码中的新名称 | 说明 |
|---------------|------------------|------|
| `LLMContext` | `LLMGenerationContext` | LLM 生成上下文 |
| `LLMInput` | `LLMGenerationInput` | LLM 输入结构 |
| `LLMOutput` | `LLMGenerationOutput` | LLM 输出结构 |
| `LLMResponse` | `LLMGenerationResponse` | LLM 响应（含元数据） |
| `LLMChoice` | `LLMGeneratedChoice` | LLM 生成的选项 |
| `HistoryEntry` | `LLMHistoryEntry` | 历史记录条目 |
| `PlayerVisibleState` | `LLMPlayerVisibleState` | 玩家可见状态 |

---

## 如何使用

### 正确的导入方式

```typescript
// ✅ 正确
import {
  LLMGenerationContext,
  LLMGenerationInput,
  LLMGenerationOutput,
  LLMGenerationResponse,
  LLMGeneratedChoice,
  LLMHistoryEntry,
} from '@survival-game/shared';

// ❌ 错误（这些不存在）
import { LLMContext, LLMInput, LLMOutput } from '@survival-game/shared';
```

### 在代码中使用

```typescript
// 定义函数返回类型
async function generate(prompt: string): Promise<LLMGenerationResponse> {
  // ...
}

// 类型注解
const output: LLMGenerationOutput = {
  narrative: { text: "...", source: "environment" },
  choices: [/* ... */],
  tags: ["exploration"]
};

// 类型守卫
if (response.output) {
  const validated: LLMGenerationOutput = response.output;
}
```

---

## 现有文件已更新

以下文件已使用正确的类型名称：

- ✅ `packages/shared/src/types/llm.ts` - 类型定义
- ✅ `packages/server/src/services/context-builder.ts`
- ✅ `packages/server/src/services/game-step-controller.ts`
- ✅ `packages/server/src/services/llm-client.ts`
- ✅ `packages/server/src/services/schema-validator.ts`
- ✅ `STAGE4_MANUAL.md` - 操作手册（已更新）

---

## 文档兼容性

如果你在其他文档中看到旧的类型名称，请对照上表进行转换：

- 文档说 `LLMResponse` → 实际使用 `LLMGenerationResponse`
- 文档说 `LLMOutput` → 实际使用 `LLMGenerationOutput`
- 以此类推...

---

## FAQ

### Q: 为什么不直接修改旧类型？

A: `types/core.ts` 是旧游戏引擎系统，仍在使用。为了向后兼容和清晰区分新旧系统，Phase 4 使用了新的命名空间。

### Q: 旧的 `LLMContext` 和新的 `LLMGenerationContext` 有什么区别？

A:
- **旧 `LLMContext`**（`types/core.ts:176`）：简单的上下文结构，用于旧事件系统
- **新 `LLMGenerationContext`**（`types/llm.ts:59`）：结构化的上下文，包含 scene/player/history/meta

### Q: 我应该使用哪个？

A:
- **Phase 4 新系统**（LLM 驱动叙事）：使用 `LLMGeneration*` 系列类型
- **旧事件系统**：继续使用 `types/core.ts` 中的类型

### Q: 未来会统一吗？

A: 可能。Phase 5+ 可能会废弃旧系统，届时可以统一命名。但目前为了稳定性，保持两套并存。

---

## 快速参考卡片

```typescript
// Phase 4 LLM System Types (新系统)
import {
  LLMGenerationContext,      // 生成上下文
  LLMGenerationInput,         // 输入（context + constraints）
  LLMGenerationOutput,        // 输出（narrative + choices + tags）
  LLMGenerationResponse,      // 响应（含 success/error）
  LLMGeneratedChoice,         // 单个选项
  LLMHistoryEntry,            // 历史条目
  LLMContextScene,            // 场景上下文
  LLMContextPlayer,           // 玩家上下文
  LLMContextMeta,             // 元信息上下文
  LLMConstraints,             // 约束条件
  LLMNarrative,               // 叙事结构
} from '@survival-game/shared';

// Old Event System Types (旧系统)
import {
  LLMContext,                 // 旧上下文（不要用于 Phase 4）
  LLMResponse,                // 旧响应（不要用于 Phase 4）
  GameEvent,
  Choice,
  Outcome,
  // ...
} from '@survival-game/shared';
```

---

**最后更新**: 2025-01-XX
**状态**: 所有代码和主要文档已更新
