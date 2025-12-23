# 叙事连贯性修复 V2

## 问题诊断

### 用户反馈
- UI V2 和历史显示功能正常 ✅
- 但 LLM 生成的叙事仍然不连贯 ❌
- 每次都像在问起始的选择，而不是延续上一步

### 根本原因

**之前的实现问题**：
1. Context 以大段 JSON 注入，LLM 可能看不清楚历史
2. 没有用自然语言明确告诉 LLM "玩家刚才做了什么"
3. Prompt 的连贯性规则埋在后面，不够显眼

---

## 解决方案

### 1. 添加自然语言摘要

在 `game-step-controller.ts` 中，为每次请求生成明确的摘要：

**第一步（无历史）**：
```markdown
---
**ATTENTION: FIRST STEP**

This is the opening scene (step 0). Generate an atmospheric introduction to the scene based on the scene context above.
---
```

**后续步骤（有历史）**：
```markdown
---
**ATTENTION: LAST PLAYER ACTION**

The player just completed step 2.

**What the player chose**: "进入裂口"

Your narrative MUST start by describing what happens as a DIRECT RESULT of this action.

- If player chose "进入裂口", your narrative should begin INSIDE the crack/crevice
- If player chose "向山上攀登", your narrative should describe the climbing process or arrival
- If player chose "停下休息", your narrative should describe the rest period or what player notices during rest

DO NOT ignore this action. DO NOT jump to a different location. Continue the story from this exact point.
---
```

**注入位置**：
```
## Input Context

{JSON context here}

{LAST_CHOICE_SUMMARY here}  ← 在 JSON 之后，Constraints 之前

## Constraints

{Constraints JSON here}
```

**为什么这样设计**：
- LLM 在看到 JSON 后，立即看到自然语言的明确指令
- 使用 **ATTENTION** 和 **MUST** 等强调词
- 提供具体示例（如果选择"进入裂口"应该怎么写）

---

### 2. 强化 Prompt 顶部规则

在 Prompt 模板最顶部，紧接着标题，添加：

```markdown
## ⚠️ CRITICAL RULE #1: NARRATIVE CONTINUITY

**IF THE PLAYER MADE A CHOICE IN THE PREVIOUS STEP:**
- Your narrative MUST describe what happens IMMEDIATELY AFTER that choice
- DO NOT jump to a different location or time
- DO NOT ignore the player's action
- The narrative should feel like a natural continuation of the player's decision

**Example:**
- Player chose: "进入裂口" → Your narrative MUST start INSIDE the crack
- Player chose: "向前探索" → Your narrative MUST describe moving forward
- Player chose: "停下休息" → Your narrative MUST describe resting or what happens during rest

**This is the MOST IMPORTANT rule. Violating this breaks immersion.**
```

**为什么放在顶部**：
- LLM 首先看到最重要的规则
- 使用醒目的 emoji (⚠️) 和编号 (#1)
- 明确说明"这是最重要的规则"

---

### 3. 在 Reminders 部分再次强调

```markdown
## Reminders

- **MOST IMPORTANT**: Continue the story from the player's last action (see LAST PLAYER ACTION above)
- Output ONLY the JSON object, nothing else
- ...
- **Again**: If player chose "进入裂口", your narrative MUST start inside the crack, NOT at a mountain top or anywhere else
```

**为什么重复**：
- 在 Prompt 结尾再次提醒
- 使用具体的反例（"NOT at a mountain top"）

---

### 4. 详细日志系统

添加了多个日志点，帮助诊断问题：

**发送到 LLM 之前**：
```
[Controller] Last player action: "进入裂口"
[Controller] LLM should generate narrative INSIDE/AFTER this action
```

**LLM 返回之后**：
```
[Controller] LLM output validated successfully
[Controller] Generated narrative: "你小心翼翼地踏入裂口，内部的空气更加寒冷..."
[Controller] Continuity check:
  Player chose: "进入裂口"
  LLM generated: "你小心翼翼地踏入裂口，内部的空气更加寒冷..."
```

**用途**：
- 可以直接看到玩家选择和 LLM 生成的叙事对比
- 快速判断是否连贯

---

## 修改的文件

1. **prompts/templates/scene_and_choices.prompt.md**
   - 添加 `{{LAST_CHOICE_SUMMARY}}` 占位符
   - 顶部添加 "⚠️ CRITICAL RULE #1: NARRATIVE CONTINUITY"
   - Reminders 部分再次强调连贯性

2. **packages/server/src/services/game-step-controller.ts**
   - 添加 `lastChoiceSummary` 生成逻辑（line 96-125）
   - 将摘要注入到 prompt（line 128-132）
   - 添加详细日志（line 137-144, 177-185）

---

## 测试步骤

### 1. 重启后端

```bash
cd packages/server
npm run dev
```

### 2. 访问游戏

```
http://localhost:3000/demo
```

### 3. 测试场景

**步骤 1**：开始游戏
- 后端日志应该显示：
  ```
  [Controller] First step - generating opening scene
  ```

**步骤 2**：选择 "向山上攀登"
- 后端日志应该显示：
  ```
  [Controller] Last player action: "向山上攀登"
  [Controller] LLM should generate narrative INSIDE/AFTER this action
  [Controller] Generated narrative: "攀登的过程比预想的更艰难，你的体力在持续消耗..."
  [Controller] Continuity check:
    Player chose: "向山上攀登"
    LLM generated: "攀登的过程比预想的更艰难，你的体力在持续消耗..."
  ```

**步骤 3**：选择 "进入裂口"
- 后端日志应该显示：
  ```
  [Controller] Last player action: "进入裂口"
  [Controller] Continuity check:
    Player chose: "进入裂口"
    LLM generated: "你小心翼翼地踏入裂口，内部的空气更加寒冷..."
  ```

**预期结果**：
- 叙事应该延续玩家的选择
- 不应该跳跃到无关的地点

---

## 预期效果对比

### 之前（V1 修复）

**问题**：即使添加了连贯性规则，LLM 仍然可能忽略

**原因**：
- 规则埋在 prompt 中间
- 没有用自然语言明确说明玩家做了什么
- LLM 需要自己从 JSON history 数组中推断

**示例**：
```
玩家选择: "进入裂口"
LLM 生成: "你站在山顶，眺望远方..." ❌
```

---

### 之后（V2 修复）

**改进**：
1. Prompt 顶部就强调连贯性（第一眼看到）
2. 自然语言明确说明"玩家刚做了什么"
3. 提供具体示例和反例
4. 在 Reminders 再次提醒

**Prompt 结构**：
```
⚠️ CRITICAL RULE #1: NARRATIVE CONTINUITY
(规则说明)

## Input Context
{JSON}

---
**ATTENTION: LAST PLAYER ACTION**
The player just chose: "进入裂口"
Your narrative MUST start INSIDE the crack.
---

## Constraints
{JSON}

## Reminders
- MOST IMPORTANT: Continue from last action
```

**示例**：
```
玩家选择: "进入裂口"
LLM 看到: "ATTENTION: The player just chose '进入裂口', narrative MUST start INSIDE"
LLM 生成: "你小心翼翼地踏入裂口，内部的空气更加寒冷..." ✓
```

---

## 为什么这次应该有效

### 心理学原理

1. **首因效应**：Prompt 顶部的信息最容易被记住
2. **近因效应**：Prompt 结尾的信息也容易被记住
3. **重复强化**：同一信息出现 3 次（顶部、中间、结尾）

### LLM 特性

1. **自然语言优于 JSON**：LLM 更容易理解自然语言指令
2. **具体示例优于抽象规则**：提供"进入裂口 → 叙事应该在裂口内部"这样的具体例子
3. **强调词有效**：使用 **ATTENTION**, **MUST**, **CRITICAL** 等词

### 三重保障

1. **顶部规则**：LLM 第一眼看到连贯性要求
2. **中间摘要**：紧接着 JSON 后，明确说明玩家做了什么
3. **结尾提醒**：再次强调连贯性

---

## 调试技巧

### 如果还是不连贯

**检查后端日志**：
```
[Controller] Last player action: "..."
[Controller] Continuity check:
  Player chose: "..."
  LLM generated: "..."
```

**问题分析**：
1. 如果 "Player chose" 是正确的，但 "LLM generated" 不连贯
   → LLM 仍然忽略了指令，可能需要更强的 prompt
   → 或者考虑使用 GPT-4 (更好的指令遵循能力)

2. 如果 "Player chose" 显示为空或错误
   → 前端没有正确传递 history
   → 检查 `LLMGameUI_v2.tsx` 中的 `handleChoice` 函数

3. 如果日志根本不显示 "Continuity check"
   → 可能 LLM 校验失败，使用了 fallback
   → 检查 `[Controller] LLM output validation failed` 日志

---

## 未来改进方向

### 短期（如果还有问题）

1. **更激进的 Prompt**：
   ```markdown
   CRITICAL WARNING: If your narrative does NOT continue from the player's last action,
   the entire response will be rejected. You MUST follow the continuity rule.
   ```

2. **Few-shot Examples**：
   在 Prompt 中提供多个完整的对话示例，展示正确的连贯性

3. **Post-processing 检查**：
   在后端检查 LLM 输出是否包含玩家选择的关键词
   例如：玩家选择"进入裂口"，检查叙事是否包含"裂口"或相关词汇

### 长期

1. **使用 Chain of Thought**：
   要求 LLM 先总结玩家做了什么，再生成叙事

2. **Embedding 相似度检查**：
   计算玩家选择和 LLM 叙事的语义相似度

3. **强化学习**：
   对连贯的叙事给予奖励，训练自定义模型

---

## 总结

**核心改进**：
1. ✅ Prompt 顶部强调连贯性（⚠️ CRITICAL RULE #1）
2. ✅ 自然语言明确说明玩家做了什么
3. ✅ 提供具体示例和反例
4. ✅ 三次重复（顶部、中间、结尾）
5. ✅ 详细日志帮助诊断

**预期结果**：
- LLM 应该能正确延续玩家的选择
- 叙事应该从玩家行动的直接后果开始
- 不应该跳跃到无关的地点或时间

**现在请重启后端测试，并查看日志中的 Continuity check！**
