# UI V2 和叙事连贯性修复

## 修复的两个核心问题

### 问题 1：LLM 叙事不连贯

**症状**：
- 玩家在"山腰的裂口处"选择"进入裂口"
- 下一步 LLM 生成的叙事却是"你站在山顶的裂口处"
- 叙事跳跃，不遵循玩家的选择

**原因**：
- Prompt 模板没有明确要求 LLM 基于最后一次选择生成连续场景
- LLM 不知道 `history` 数组中的最后一个条目是玩家刚做的选择

**修复**：
在 `prompts/templates/scene_and_choices.prompt.md` 中添加了 **CRITICAL: Narrative Continuity Rules** 部分：
```markdown
## CRITICAL: Narrative Continuity Rules

**If history exists (step > 0):**

1. **MUST continue from the last choice**:
   - Look at the LAST entry in `history` array
   - Read `history[-1].choiceText` - this is what the player JUST DID
   - Your narrative MUST describe the IMMEDIATE CONSEQUENCE of that action

2. **Examples of CORRECT continuity**:
   - Player chose: "进入裂口" → Your narrative: "你小心翼翼地踏入裂口，内部的空气更加寒冷..."
   - Player chose: "向山上攀登" → Your narrative: "攀登的过程比预想的更艰难，你的体力在持续消耗..."

3. **Examples of WRONG continuity (NEVER do this)**:
   - Player chose: "进入裂口" → Your narrative: "你站在山顶..." ❌
   - Player chose: "向前探索" → Your narrative: "你决定停下来休息..." ❌
```

---

### 问题 2：玩家看不到历史记录

**症状**：
- 玩家每次只能看到当前步骤的叙事和选项
- 选择后，前面的内容消失
- 无法回顾自己的选择历史

**原因**：
- 旧的 UI 设计每次只显示最新的 `currentStep`
- 选择后直接覆盖，不保留历史

**修复**：
重新设计 UI 为**滚动式对话界面**（`LLMGameUI_v2.tsx`）：
- 所有历史步骤保留在 `storyEntries[]` 数组中
- 每个条目包含：叙事 + 选项 + 已选择的选项 ID
- 已选择的选项显示 ✓ 标记，变为不可点击状态
- 最新的选项可以点击
- 自动滚动到底部

---

## 详细修改内容

### 1. Prompt 模板修改 (prompts/templates/scene_and_choices.prompt.md)

**新增部分**：
```markdown
## CRITICAL: Narrative Continuity Rules

**If history exists (step > 0):**

1. **MUST continue from the last choice**:
   - Look at the LAST entry in `history` array
   - Read `history[-1].choiceText` - this is what the player JUST DID
   - Your narrative MUST describe the IMMEDIATE CONSEQUENCE of that action

2. **Examples of CORRECT continuity**:
   - Player chose: "进入裂口" → Your narrative: "你小心翼翼地踏入裂口，内部的空气更加寒冷..."
   - Player chose: "向山上攀登" → Your narrative: "攀登的过程比预想的更艰难，你的体力在持续消耗..."
   - Player chose: "停下休息" → Your narrative: "在短暂的休息中，你注意到周围的异常现象..."

3. **Examples of WRONG continuity (NEVER do this)**:
   - Player chose: "进入裂口" → Your narrative: "你站在山顶..." ❌ (WRONG)
   - Player chose: "向前探索" → Your narrative: "你决定停下来休息..." ❌ (WRONG)
   - Player chose: "检查背包" → Your narrative: "你继续前进..." ❌ (WRONG)

4. **Spatial and temporal coherence**:
   - Location must make sense (if player entered a cave, narrative should be INSIDE the cave)
   - Time must progress (don't go backwards or jump locations)
   - Environmental changes must be gradual

**If history is empty (step = 0):**
- Generate an opening scene based on `scene.description` and `scene.theme`
```

**效果**：
- LLM 现在会明确知道要基于 `history[-1].choiceText` 生成叙事
- 提供了正确/错误的示例，引导 LLM 生成连贯的内容
- 强调空间和时间连贯性

---

### 2. UI V2 设计 (LLMGameUI_v2.tsx)

**核心改变**：

#### 数据结构改变

**之前**：
```typescript
const [currentStep, setCurrentStep] = useState<StepData | null>(null);
// 只保存当前步骤
```

**之后**：
```typescript
interface StoryEntry {
  step: number;
  narrative: string;
  narrativeSource: string;
  choices: Array<{ id: string; text: string; riskHint: string }>;
  selectedChoiceId?: string; // 记录玩家选择了哪个
  usedFallback: boolean;
}

const [storyEntries, setStoryEntries] = useState<StoryEntry[]>([]);
// 保存所有历史步骤
```

#### UI 结构改变

**之前**：
```
┌─────────────────────────┐
│   当前叙事文本          │
│                         │
│   选项1  选项2  选项3   │
└─────────────────────────┘
(选择后，内容被覆盖)
```

**之后**：
```
┌─────────────────────────┐
│ 步骤 1                  │
│ 叙事文本...             │
│ ✓ 选项1  选项2  选项3   │ ← 已选择，不可点击
├─────────────────────────┤
│ 步骤 2                  │
│ 叙事文本...             │
│ ✓ 选项2  选项1  选项3   │ ← 已选择，不可点击
├─────────────────────────┤
│ 步骤 3                  │
│ 叙事文本...             │
│ 选项1  选项2  选项3     │ ← 最新，可点击
└─────────────────────────┘
(自动滚动到底部)
```

#### 选择处理逻辑

```typescript
const handleChoice = async (choiceId: string, choiceText: string) => {
  // 1. 标记当前条目的选择
  setStoryEntries(prev => {
    const updated = [...prev];
    const lastEntry = updated[updated.length - 1];
    if (lastEntry) {
      lastEntry.selectedChoiceId = choiceId; // 记录选择
    }
    return updated;
  });

  // 2. 更新 session history
  const newHistoryEntry = {
    step: session.step,
    eventId: `step_${session.step}`,
    choiceId,
    choiceText,
    outcome: { summary: `你选择了${choiceText}` }
  };

  // 3. 请求下一步（LLM 会看到这个 history）
  await loadStep(updatedSession);
};
```

#### 自动滚动

```typescript
const storyContainerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (storyContainerRef.current) {
    storyContainerRef.current.scrollTop = storyContainerRef.current.scrollHeight;
  }
}, [storyEntries]); // 每次新增条目时滚动到底部
```

---

### 3. CSS 样式 (LLMGameUI_v2.css)

**关键样式**：

#### 滚动容器
```css
.story-container {
  flex: 1;
  overflow-y: auto; /* 允许滚动 */
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}
```

#### 选项卡片状态
```css
/* 可点击（最新步骤，未选择） */
.choice-card.clickable {
  cursor: pointer;
}

.choice-card.clickable:hover {
  border-color: #00d9ff;
  transform: translateY(-3px);
  box-shadow: 0 5px 20px rgba(0, 217, 255, 0.3);
}

/* 已选择 */
.choice-card.selected {
  background: rgba(0, 217, 255, 0.15);
  border-color: #00d9ff;
}

/* 不可点击（历史步骤） */
.choice-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 淡入动画
```css
.story-entry {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 4. 路由更新 (SceneDemoPage.tsx)

```typescript
// 之前
import { LLMGameUI } from '../../components/LLMGameUI';
export const SceneDemoPage: React.FC = () => {
  return <LLMGameUI />;
};

// 之后
import { LLMGameUI_v2 } from '../../components/LLMGameUI_v2';
export const SceneDemoPage: React.FC = () => {
  return <LLMGameUI_v2 />;
};
```

---

## 新功能特性

### 1. 完整的历史记录显示

**功能**：
- 玩家可以看到所有历史步骤
- 每个步骤包含：步骤编号、叙事文本、所有选项、玩家的选择

**视觉效果**：
```
步骤 1
你站在禁区边缘，远处的山坡笼罩在薄雾中...
✓ 继续向前，沿着山坡边缘前进 (已选择)
  停下来仔细观察周围环境
  检查背包中的物资

步骤 2
在前进的过程中，你注意到一处山腰的裂口...
  绕过裂口，继续攀登
✓ 进入裂口，探索内部 (已选择)
  停下观察裂口的边缘

步骤 3 (最新)
你小心翼翼地踏入裂口，内部的空气更加寒冷... (← 连贯！)
  继续深入裂口 (可点击)
  停下检查周围 (可点击)
  退回到入口处 (可点击)
```

---

### 2. 选择状态可视化

**三种状态**：
1. **已选择** (✓ 标记，高亮背景，不可点击)
2. **可选择** (悬停效果，可点击)
3. **历史选项** (半透明，不可点击)

---

### 3. 自动滚动

**行为**：
- 每次新增步骤，自动滚动到底部
- 玩家可以手动向上滚动查看历史
- 新步骤出现时会自动回到底部

---

### 4. 加载状态显示

**视觉反馈**：
```
[Spinner] LLM 正在生成下一步...
```

---

## 测试步骤

### 1. 重启前端

```bash
cd packages/client
npm run dev
```

### 2. 访问游戏

```
http://localhost:3000/demo
```

### 3. 测试场景

**步骤 1**：点击"开始探索"
- 应该看到：初始叙事 + 3个选项

**步骤 2**：选择"向山上攀登"
- 应该看到：
  - 步骤 1 的叙事和选项（"向山上攀登"有 ✓ 标记）
  - 步骤 2 的叙事："攀登的过程比预想的更艰难..."（连贯）
  - 步骤 2 的新选项（可点击）

**步骤 3**：选择"进入裂口"
- 应该看到：
  - 步骤 1、2 的完整历史
  - 步骤 3 的叙事："你小心翼翼地踏入裂口..."（连贯）
  - 步骤 3 的新选项（可点击）

**步骤 4**：向上滚动
- 可以查看所有历史步骤
- 所有已选择的选项有 ✓ 标记

---

## 预期效果对比

### 之前

**步骤 1**：
```
叙事：你站在山腰的裂口处...
选项：[进入裂口] [绕过裂口] [观察裂口]
```

玩家选择：**进入裂口**

**步骤 2**（问题）：
```
叙事：你站在山顶，眺望远方... ❌ (不连贯！)
```

### 之后

**步骤 1**：
```
步骤 1
叙事：你站在山腰的裂口处...
✓ [进入裂口]  [绕过裂口]  [观察裂口]
```

**步骤 2**（正确）：
```
步骤 2
叙事：你小心翼翼地踏入裂口，内部的空气更加寒冷，墙壁上有奇怪的图案... ✓ (连贯！)
[继续深入]  [检查图案]  [退回入口]
```

---

## 关键改进点总结

### Prompt 改进
1. ✅ 明确要求 LLM 基于 `history[-1].choiceText` 生成叙事
2. ✅ 提供正确/错误示例
3. ✅ 强调空间和时间连贯性

### UI 改进
1. ✅ 滚动式对话界面
2. ✅ 完整历史记录显示
3. ✅ 已选择选项可视化（✓ 标记）
4. ✅ 自动滚动到底部
5. ✅ 淡入动画
6. ✅ 加载状态显示

### 用户体验改进
1. ✅ 玩家可以看到完整的故事发展
2. ✅ 玩家可以回顾自己的选择
3. ✅ 叙事连贯性大幅提升
4. ✅ 视觉反馈更清晰

---

## 已知限制

1. **历史记录无限制**：
   - 目前所有历史步骤都保留
   - 如果玩家玩了 100 步，页面会很长
   - **未来改进**：考虑只显示最近 20 步，提供"查看完整历史"按钮

2. **无法修改历史选择**：
   - 一旦选择，无法撤销
   - **未来改进**：可以添加"返回上一步"功能

3. **outcome.summary 仍然简化**：
   - 目前只是"你选择了XXX"
   - **未来改进**：由规则引擎计算实际后果

---

## 下一步建议

1. **测试叙事连贯性**：
   - 玩几轮游戏，确认 LLM 生成的叙事确实基于玩家选择

2. **优化历史显示**：
   - 如果历史太长，考虑折叠旧条目

3. **添加导出功能**：
   - 允许玩家导出完整的故事文本

4. **优化 loading 体验**：
   - 可以显示"LLM 思考中..."的文字效果

---

**现在请重启前端测试新的滚动式 UI！**
