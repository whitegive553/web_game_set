# Tag 校验问题修复

## 问题

### 之前的错误

```
[Controller] LLM output validation failed: [ 'tags[2] "isolation" is not a valid tag' ]
```

**原因**：
- LLM 生成了 `"tags": ["exploration", "anomaly_hint", "isolation"]`
- 但 `schema-validator.ts` 中硬编码了允许的 tag 列表：
  ```typescript
  const validTags = [
    'exploration', 'encounter', 'anomaly', 'anomaly_hint',
    'discovery', 'danger', 'rest', 'decision', 'resource', 'navigation'
  ];
  ```
- `"isolation"` 不在列表中，导致校验失败

**问题所在**：
- 限制了 LLM 的创造性
- 每次想用新 tag 都要修改代码
- 不符合 LLM 驱动叙事的设计理念

---

## 解决方案

### ✅ 移除硬编码的 tag 列表

**新的校验规则**：
1. **类型校验**：必须是字符串
2. **长度校验**：2-50 字符
3. **格式校验**：只能包含小写字母、数字、下划线（`^[a-z0-9_]+$`）

**修改的文件**：
1. `packages/server/src/services/schema-validator.ts:230-252`
2. `prompts/schemas/llm_output.schema.json:55-65`
3. `prompts/templates/scene_and_choices.prompt.md:89-93`

---

## 修改详情

### 1. Schema Validator (packages/server/src/services/schema-validator.ts)

**之前**：
```typescript
const validTags = [
  'exploration', 'encounter', 'anomaly', 'anomaly_hint',
  'discovery', 'danger', 'rest', 'decision', 'resource', 'navigation'
];

output.tags.forEach((tag: any, index: number) => {
  if (typeof tag !== 'string') {
    errors.push(`tags[${index}] must be a string`);
  } else if (!validTags.includes(tag)) {
    errors.push(`tags[${index}] "${tag}" is not a valid tag`);
  }
});
```

**之后**：
```typescript
output.tags.forEach((tag: any, index: number) => {
  if (typeof tag !== 'string') {
    errors.push(`tags[${index}] must be a string`);
  } else {
    // Basic validation: tag should be reasonable length
    if (tag.length < 2 || tag.length > 50) {
      errors.push(`tags[${index}] must be between 2 and 50 characters`);
    }
    // Tag should be alphanumeric with underscores
    if (!/^[a-z0-9_]+$/.test(tag)) {
      errors.push(`tags[${index}] must contain only lowercase letters, numbers, and underscores`);
    }
  }
});
```

---

### 2. JSON Schema (prompts/schemas/llm_output.schema.json)

**之前**：
```json
"tags": {
  "type": "array",
  "minItems": 1,
  "maxItems": 3,
  "items": {
    "type": "string",
    "enum": [
      "exploration",
      "encounter",
      "anomaly",
      ...
    ]
  }
}
```

**之后**：
```json
"tags": {
  "type": "array",
  "minItems": 1,
  "maxItems": 3,
  "items": {
    "type": "string",
    "pattern": "^[a-z0-9_]{2,50}$",
    "description": "Tag must be lowercase, alphanumeric with underscores, 2-50 characters"
  },
  "description": "Descriptive tags for this narrative segment (e.g., 'exploration', 'danger', 'isolation'). LLM can create new tags that fit the atmosphere."
}
```

---

### 3. Prompt 模板 (prompts/templates/scene_and_choices.prompt.md)

**之前**：
```markdown
### tags
- Array of 1-3 descriptive tags
- Examples: "exploration", "encounter", "anomaly", "discovery", "danger", "rest"
- Used for game telemetry and theming
```

**之后**：
```markdown
### tags
- Array of 1-3 descriptive tags (lowercase, use underscores for multi-word)
- Examples: "exploration", "encounter", "anomaly", "anomaly_hint", "discovery", "danger", "rest", "decision", "resource", "navigation", "isolation", "tension", "mystery", "survival", "horror", "environmental", "psychological"
- You can create new tags that fit the scene atmosphere
- Used for game telemetry and theming
```

---

## 现在支持的 Tag 示例

### ✅ 所有这些 tag 都是有效的

**情绪/氛围**：
- `isolation` - 孤独、隔离
- `tension` - 紧张
- `mystery` - 神秘
- `horror` - 恐怖
- `despair` - 绝望
- `hope` - 希望

**环境**：
- `environmental` - 环境因素
- `weather` - 天气
- `darkness` - 黑暗
- `fog` - 雾

**行为**：
- `stealth` - 潜行
- `combat` - 战斗
- `escape` - 逃脱
- `investigation` - 调查

**状态**：
- `wounded` - 受伤
- `exhausted` - 疲惫
- `starving` - 饥饿

**事件**：
- `discovery` - 发现
- `encounter` - 遭遇
- `anomaly` - 异常
- `trap` - 陷阱

---

## ❌ 无效的 Tag 示例

**包含大写字母**：
- `Exploration` ❌
- `DANGER` ❌

**包含空格**：
- `environmental hazard` ❌
- 应该用：`environmental_hazard` ✅

**包含特殊字符**：
- `danger!` ❌
- `探索` ❌（非 ASCII）
- `danger-zone` ❌（连字符）

**太短或太长**：
- `a` ❌（少于 2 字符）
- `this_is_a_very_very_very_very_very_long_tag_that_exceeds_fifty_characters` ❌

---

## 测试

### 重启服务器

```bash
cd packages/server
npm run dev
```

### 访问游戏

```
http://localhost:3000/demo
```

### 预期结果

**之前**（会报错）：
```json
{
  "tags": ["exploration", "anomaly_hint", "isolation"]
}
```
❌ `tags[2] "isolation" is not a valid tag`

**现在**（正常通过）：
```json
{
  "tags": ["exploration", "anomaly_hint", "isolation"]
}
```
✅ 校验通过

### 检查后端日志

**成功的日志**：
```
[LLM] OpenAI response received successfully
[LLM] Response length: 496 characters
[Controller] Parsing rawOutput from LLM...
[Controller] LLM output validated successfully  ← 应该显示这个
```

**不应该再看到**：
```
[Controller] LLM output validation failed: [ 'tags[2] "isolation" is not a valid tag' ]
```

---

## 为什么这样设计？

### 1. LLM 有创造性的自由

- LLM 可以根据场景氛围生成最合适的 tag
- 不需要人工预定义所有可能的 tag
- 更符合 "LLM 驱动叙事" 的设计理念

### 2. 仍然保证数据质量

- 必须是字符串（不是数字或对象）
- 长度合理（2-50 字符）
- 格式规范（小写字母、数字、下划线）
- 数量限制（1-3 个）

### 3. 便于扩展

- 未来可以基于 tag 实现：
  - 成就系统（"获得 10 个 'discovery' tag"）
  - 统计分析（"玩家遇到 'danger' tag 的频率"）
  - 动态难度（"连续 3 个 'rest' tag，增加危险事件概率"）

---

## 常见问题

### Q: 如果 LLM 生成了不合理的 tag 怎么办？

A:
- 格式校验会阻止大部分问题（大写、特殊字符、太长）
- Prompt 中提供了大量示例，引导 LLM 生成合适的 tag
- 如果确实出现不合理的 tag，可以在未来版本中添加 "推荐 tag" 机制

### Q: 可以使用中文 tag 吗？

A:
- 目前不支持，因为正则表达式限制为 `^[a-z0-9_]+$`
- 如果需要支持中文，可以修改为 `/^[\u4e00-\u9fa5a-z0-9_]+$/`
- 但建议保持英文 tag，便于代码中使用

### Q: 多词 tag 应该怎么写？

A: 使用下划线分隔
- ✅ `environmental_hazard`
- ✅ `anomaly_hint`
- ✅ `psychological_horror`
- ❌ `environmental hazard`（空格）
- ❌ `environmental-hazard`（连字符）

---

## 总结

**修复前**：
- 硬编码 10 个 tag
- LLM 生成 "isolation" → ❌ 校验失败 → 降级文本

**修复后**：
- 只校验格式，不限制具体值
- LLM 生成 "isolation" → ✅ 校验通过 → 正常显示

**好处**：
- LLM 有创造性自由
- 仍然保证数据格式正确
- 更符合设计理念

**现在请重启服务器测试！**
