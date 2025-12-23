# Phase 4 Enhanced Implementation Plan

## 已完成文件

### 新增文件（已创建）
1. ✅ `packages/shared/src/types/intent.ts` - Intent 枚举定义
2. ✅ `packages/shared/src/types/plot.ts` - Plot 类型定义
3. ✅ `packages/server/src/services/plot-director.ts` - PlotDirector 服务
4. ✅ `scenes/zone_01/plot.json` - zone_01 剧情蓝图

### 已修改文件
1. ✅ `packages/shared/src/types/llm.ts` - 添加 intent 字段、扩展 context
2. ✅ `packages/shared/src/index.ts` - 导出新类型
3. ✅ `packages/server/src/services/scene-loader.ts` - 添加 loadPlotBlueprint 方法

---

## 待完成核心文件

### 1. context-builder.ts 扩展（高优先级）
**职责**：集成 plot/antiStall/pacing 到 LLM context

**新增方法**：
- `buildPlotContext(plotDirector, step): LLMContextPlot`
- `buildAntiStallContext(plotDirector): LLMContextAntiStall`
- `buildPacingContext(plotDirector, step): LLMContextPacing`

**修改**：
- `buildContext()` - 调用上述方法并添加到 context

---

### 2. game-step-controller.ts 重构（最高优先级）
**职责**：集成 PlotDirector，管理完整的 step 流程

**新增**：
- 初始化 PlotDirector（从 scene plot.json）
- 每步调用 PlotDirector 获取 plot/pacing context
- 选择后更新 PlotDirector antiStall 状态
- 根据 intent 生成确定性 effects
- 生成事实型 consequenceSummary

**关键逻辑**：
```typescript
// 伪代码
async generateStep(input) {
  // 1. Load scene + plot
  const scene = await sceneLoader.loadScene(sceneId);
  const plotBlueprint = sceneLoader.loadPlotBlueprint(sceneId);

  // 2. Initialize PlotDirector (or restore state)
  if (!this.plotDirector) {
    this.plotDirector = new PlotDirector(plotBlueprint, savedPlotState);
  }

  // 3. Get plot context
  const plotContext = this.plotDirector.determinePlotContext(step);
  const pacingContext = this.plotDirector.determinePacingConstraints(step);
  const antiStallContext = this.plotDirector.getAntiStallContext();

  // 4. Build extended context
  const llmInput = this.contextBuilder.buildLLMInput(..., {
    plot: plotContext,
    pacing: pacingContext,
    antiStall: antiStallContext
  });

  // 5. Call LLM...
  // 6. Validate output (including intent validation)
  // 7. Return to frontend
}

// When player makes choice:
handleChoice(choiceId, choiceIntent) {
  // Update plot director anti-stall
  this.plotDirector.updateAntiStall(choiceIntent);

  // Generate deterministic effects based on intent
  const effects = this.ruleEngine.execute(choiceIntent, gameState, plotContext);

  // Create factual consequence summary
  const consequenceSummary = this.generateConsequenceSummary(effects);

  // Add to history
  history.push({ choiceId, choiceText, intent, consequenceSummary });
}
```

---

### 3. Prompt 模板修改（高优先级）
**文件**：`prompts/templates/scene_and_choices.prompt.md`

**新增**：
- Plot context 说明（act/beat/goal/mustReveal）
- Anti-stall constraints（forbiddenIntents）
- Pacing requirements（requireOneOf）
- Intent 字段要求

**关键片段**：
```markdown
## Plot Progression Context

{{PLOT_CONTEXT}}

Current Act: {{ACT}}
Current Beat: {{BEAT}}
Goal: {{GOAL}}

**MUST REVEAL** in this step:
{{MUST_REVEAL_LIST}}

## Anti-Stall Constraints

Recent player intents: {{RECENT_INTENTS}}

**FORBIDDEN intents for this turn**: {{FORBIDDEN_INTENTS}}

You MUST NOT generate choices with these intents.

## Pacing Requirements

This step MUST include at least ONE of:
- New information revealed
- New location reached
- New cost/consequence

## Output Format

Each choice MUST include an "intent" field:

{
  "id": "choice_1",
  "text": "...",
  "riskHint": "...",
  "intent": "investigate"  // REQUIRED: one of [investigate, move_forward, retreat, wait, use_item, communicate, rest, risky_act]
}
```

---

### 4. Schema 更新（中优先级）
**文件**：`prompts/schemas/llm_output.schema.json`

**修改**：
- choices[].intent 字段为 required
- intent 必须为枚举值之一

```json
{
  "choices": {
    "items": {
      "properties": {
        "intent": {
          "type": "string",
          "enum": ["investigate", "move_forward", "retreat", "wait", "use_item", "communicate", "rest", "risky_act"],
          "description": "Player action intent category"
        }
      },
      "required": ["id", "text", "riskHint", "intent"]
    }
  }
}
```

---

### 5. Rule Engine（中优先级）
**新文件**：`packages/server/src/services/rule-engine.ts`

**职责**：根据 intent + state + plot 生成确定性 effects

**示例**：
```typescript
executeIntent(intent, gameState, plotContext) {
  switch (intent) {
    case 'investigate':
      return {
        staminaCost: -5,
        revealedInfo: plotContext.mustReveal[0] || 'generic_clue',
        newFacts: ['player_investigated_area']
      };

    case 'move_forward':
      return {
        staminaCost: -10,
        locationChange: 'advanced',
        revealedInfo: 'new_location',
        newFacts: ['player_moved_forward']
      };

    // ... other intents
  }
}

generateConsequenceSummary(effects) {
  const parts = [];
  if (effects.staminaCost) parts.push(`体力${effects.staminaCost}`);
  if (effects.revealedInfo) parts.push(`发现了${effects.revealedInfo}`);
  if (effects.locationChange) parts.push(`位置变化：${effects.locationChange}`);
  return parts.join('，');
}
```

---

## 关键设计决策

### 1. PlotDirector 状态持久化
- 短期：存储在 game-step-controller 实例中（内存）
- 长期：序列化到前端 session state，每次请求传回

### 2. Intent 执行时机
- LLM 只生成 intent，不生成 outcome
- 前端选择后，后端根据 intent 执行规则
- Effects 写入 history.consequenceSummary

### 3. Fallback 策略
- 如果无 plot.json：使用默认线性推进
- 如果 LLM 未输出 intent：默认为 'investigate'
- 如果 forbiddenIntent 被违反：后端过滤该选项

### 4. Anti-stall 窗口大小
- 跟踪最近 8 步 intent
- 连续 2 次相同 intent 触发禁止
- 重置条件：选择不同 intent

### 5. Pacing 强制推进
- Act 最多 5 步
- Beat 有 maxStep 强制切换
- 每步必须满足 requireOneOf

---

## 最小验收标准

1. ✅ zone_01 有完整 plot.json（3 acts, 5 beats）
2. ⏳ PlotDirector 正确推进 beat/act
3. ⏳ Anti-stall 阻止连续重复 intent
4. ⏳ LLM 输出包含 intent 字段
5. ⏳ Rule engine 生成确定性 effects
6. ⏳ History 包含事实型 consequenceSummary
7. ⏳ 8-12 步内剧情明显推进（从边缘 → 发现设施 → 遭遇异常）
8. ⏳ Fallback 不破坏游戏（无 plot 时仍可玩）

---

## 实施优先级

### Phase 1（立即）- 核心集成
1. 修改 game-step-controller.ts 集成 PlotDirector
2. 修改 context-builder.ts 扩展 context
3. 修改 Prompt 模板添加 plot/pacing/antiStall 说明

### Phase 2（次要）- 规则引擎
1. 创建 rule-engine.ts
2. 实现 intent → effects 映射
3. 生成 consequenceSummary

### Phase 3（完善）- Schema 和校验
1. 更新 llm_output.schema.json
2. 添加 intent 校验
3. Fallback 策略完善

---

## 当前状态

**已完成**：
- 类型定义（Intent, Plot）
- PlotDirector 服务（完整实现）
- zone_01 plot.json（3 acts, 5 beats, 12 步预算）
- SceneLoader 扩展（loadPlotBlueprint）

**下一步**（最关键）：
- 修改 game-step-controller.ts 集成 PlotDirector
- 修改 context-builder.ts 添加 plot/antiStall/pacing
- 修改 Prompt 模板

---

**预计剩余工作量**：约 300-400 行关键代码修改
