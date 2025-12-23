/**
 * Player Choice Intent Types
 * Finite set of action categories for deterministic rule execution
 */

export enum ChoiceIntent {
  INVESTIGATE = 'investigate',      // 调查、研究、观察
  MOVE_FORWARD = 'move_forward',    // 向前移动、前进
  RETREAT = 'retreat',               // 撤退、后退
  WAIT = 'wait',                     // 等待、休息、观望
  USE_ITEM = 'use_item',            // 使用物品
  COMMUNICATE = 'communicate',       // 交流、呼叫
  REST = 'rest',                     // 休息恢复
  RISKY_ACT = 'risky_act',          // 冒险行为
}

export const INTENT_DESCRIPTIONS: Record<ChoiceIntent, string> = {
  [ChoiceIntent.INVESTIGATE]: '调查、研究、观察周围',
  [ChoiceIntent.MOVE_FORWARD]: '向前移动、探索新区域',
  [ChoiceIntent.RETREAT]: '撤退、返回',
  [ChoiceIntent.WAIT]: '等待、观望',
  [ChoiceIntent.USE_ITEM]: '使用物品或工具',
  [ChoiceIntent.COMMUNICATE]: '交流或呼叫',
  [ChoiceIntent.REST]: '休息恢复',
  [ChoiceIntent.RISKY_ACT]: '冒险行为',
};
