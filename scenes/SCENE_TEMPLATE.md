# 场景创建模板

## 快速创建新场景

### 1. 创建场景目录

```bash
mkdir scenes/YOUR_SCENE_ID
```

### 2. 复制以下模板到 `scene.json`

```json
{
  "sceneId": "YOUR_SCENE_ID",
  "name": "场景中文名称",
  "theme": ["theme1", "theme2", "theme3"],
  "description": "详细的场景描述，不给玩家直接展示，供 LLM 理解场景背景。应该包含：地形特征、环境氛围、异常现象、历史背景等。",
  "allowedEvents": ["exploration", "encounter", "anomaly", "discovery"],
  "possibleItems": [],
  "dangerLevel": 3,
  "background": {
    "preferred": "background.jpg",
    "fallbackColor": "#0b0f14"
  },
  "rules": {
    "maxSteps": 15,
    "evacuationAvailable": true,
    "deathIsPermament": false
  }
}
```

### 3. 字段说明

#### sceneId
- **类型**: string（必需）
- **说明**: 场景唯一标识符，与目录名一致
- **示例**: `"zone_01"`, `"abandoned_facility"`, `"mountain_pass"`

#### name
- **类型**: string（必需）
- **说明**: 场景显示名称（中文）
- **示例**: `"未知禁区入口"`, `"废弃研究站"`, `"异常森林深处"`

#### theme
- **类型**: string[]（必需）
- **说明**: 场景主题标签，影响 LLM 生成的叙事风格
- **可选值**:
  - 地形: `mountain`, `forest`, `urban`, `underground`, `water`, `desert`
  - 氛围: `abnormal`, `decay`, `isolation`, `claustrophobic`, `vast`, `silent`
  - 特征: `technology`, `nature`, `ruins`, `industrial`, `religious`

#### description
- **类型**: string（必需）
- **说明**: 场景的详细客观描述，供 LLM 理解背景，不直接展示给玩家
- **内容建议**:
  - 地形和环境特征
  - 异常现象的表现形式
  - 历史背景和事件
  - 危险源和不确定性因素
  - 氛围营造要素

#### allowedEvents
- **类型**: string[]（必需）
- **说明**: 该场景允许的事件类型
- **可选值**: `exploration`, `encounter`, `anomaly`, `discovery`, `danger`, `rest`, `navigation`

#### possibleItems
- **类型**: string[]（可选）
- **说明**: 该场景可能出现的道具 ID 列表
- **示例**: `["item_001", "item_002"]`

#### dangerLevel
- **类型**: number（必需）
- **说明**: 危险等级，0-10，影响 LLM 生成的紧张度和风险提示
- **建议**:
  - 0-2: 相对安全，适合新手区
  - 3-5: 中等危险，需要谨慎
  - 6-8: 高危区域，生存挑战
  - 9-10: 极度危险，近乎必死

#### background.preferred
- **类型**: string（必需）
- **说明**: 首选背景图文件名
- **支持格式**: `.jpg`, `.png`, `.gif`（动图）

#### background.fallbackColor
- **类型**: string（必需）
- **说明**: 背景图加载失败时的纯色备用背景
- **格式**: CSS 颜色值，如 `"#0b0f14"`, `"#1a1d23"`

#### rules
- **类型**: object（可选）
- **说明**: 场景规则配置
- **字段**:
  - `maxSteps`: 最大步骤数（0 = 无限制）
  - `evacuationAvailable`: 是否允许撤离
  - `deathIsPermament`: 死亡是否永久（影响重生机制）

---

## 示例：创建一个"废弃医院"场景

### scene.json

```json
{
  "sceneId": "abandoned_hospital",
  "name": "废弃医院",
  "theme": ["urban", "decay", "claustrophobic"],
  "description": "一座在异常事件中被紧急撤离的医院。走廊狭窄幽暗，墙壁上残留着划痕和血迹。医疗设备散落各处，部分仍在发出微弱的电子音。空气中弥漫着消毒水和腐败的混合气味。这里的时间流速似乎不稳定——有些房间里的时钟指针在逆向转动，有些则完全静止。偶尔能听到远处传来的金属撞击声和不明的呼吸声，但无法确定来源。",
  "allowedEvents": ["exploration", "encounter", "anomaly", "danger"],
  "possibleItems": ["medical_record", "strange_syringe"],
  "dangerLevel": 6,
  "background": {
    "preferred": "hospital_corridor.jpg",
    "fallbackColor": "#12141a"
  },
  "rules": {
    "maxSteps": 20,
    "evacuationAvailable": false,
    "deathIsPermament": false
  }
}
```

### items.json（可选）

```json
{
  "items": [
    {
      "itemId": "medical_record",
      "name": "污损的病历",
      "type": "information",
      "desc": "一份沾有不明液体的病历，记录了某位患者的异常症状",
      "meta": {
        "grantKnowledge": "patient_anomaly"
      }
    },
    {
      "itemId": "strange_syringe",
      "name": "异常注射器",
      "type": "tool",
      "desc": "内含不明蓝色液体的注射器，可能具有某种效果",
      "meta": {
        "usageType": "consumable",
        "effect": "unknown"
      }
    }
  ]
}
```

---

## 场景设计建议

### 1. 叙事深度优先
- 场景描述要足够详细，让 LLM 有充分的上下文
- 避免过于简短或模糊的描述
- 包含具体的感官细节（视觉、听觉、触觉、嗅觉）

### 2. 主题一致性
- `theme` 标签应该相互协调，不要冲突
- 例如：`["mountain", "claustrophobic"]` 可能不太合理

### 3. 危险等级梯度
- 建议设计多个危险等级的场景，形成递进关系
- 入口区域 (1-2) → 探索区域 (3-5) → 核心区域 (6-8) → 禁忌区域 (9-10)

### 4. 异常现象设计
- 现实扭曲（时间、空间、因果）
- 感知异常（幻觉、错觉、信息污染）
- 物理规则改变（重力、温度、光线）
- 存在性威胁（不可名状、概念性危险）

### 5. 背景图选择
- 使用低饱和度、高对比度的图片
- 避免过于明亮或色彩鲜艳的图片
- 推荐尺寸：1920x1080 或更高
- 文件大小：< 2MB（确保加载速度）

---

## 测试场景

创建场景后，在游戏中测试：

1. 修改前端代码，设置 `sceneId`
2. 启动游戏，观察 LLM 生成的叙事
3. 检查主题是否被正确理解
4. 调整 `description` 和 `dangerLevel` 以优化输出

---

## 高级：场景间关联

未来可以添加场景间的连接关系：

```json
{
  "sceneId": "zone_01",
  "name": "未知禁区入口",
  "connections": {
    "north": "abandoned_facility",
    "east": "mountain_pass",
    "conditional": {
      "underground_tunnel": {
        "requires": "found_tunnel_entrance"
      }
    }
  }
}
```

目前阶段暂不实现场景切换，但结构已预留扩展空间。
