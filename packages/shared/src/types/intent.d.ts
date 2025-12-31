/**
 * Player Choice Intent Types
 * Finite set of action categories for deterministic rule execution
 */
export declare enum ChoiceIntent {
    INVESTIGATE = "investigate",// 调查、研究、观察
    MOVE_FORWARD = "move_forward",// 向前移动、前进
    RETREAT = "retreat",// 撤退、后退
    WAIT = "wait",// 等待、休息、观望
    USE_ITEM = "use_item",// 使用物品
    COMMUNICATE = "communicate",// 交流、呼叫
    REST = "rest",// 休息恢复
    RISKY_ACT = "risky_act"
}
export declare const INTENT_DESCRIPTIONS: Record<ChoiceIntent, string>;
//# sourceMappingURL=intent.d.ts.map