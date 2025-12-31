"use strict";
/**
 * Player Choice Intent Types
 * Finite set of action categories for deterministic rule execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTENT_DESCRIPTIONS = exports.ChoiceIntent = void 0;
var ChoiceIntent;
(function (ChoiceIntent) {
    ChoiceIntent["INVESTIGATE"] = "investigate";
    ChoiceIntent["MOVE_FORWARD"] = "move_forward";
    ChoiceIntent["RETREAT"] = "retreat";
    ChoiceIntent["WAIT"] = "wait";
    ChoiceIntent["USE_ITEM"] = "use_item";
    ChoiceIntent["COMMUNICATE"] = "communicate";
    ChoiceIntent["REST"] = "rest";
    ChoiceIntent["RISKY_ACT"] = "risky_act";
})(ChoiceIntent || (exports.ChoiceIntent = ChoiceIntent = {}));
exports.INTENT_DESCRIPTIONS = {
    [ChoiceIntent.INVESTIGATE]: '调查、研究、观察周围',
    [ChoiceIntent.MOVE_FORWARD]: '向前移动、探索新区域',
    [ChoiceIntent.RETREAT]: '撤退、返回',
    [ChoiceIntent.WAIT]: '等待、观望',
    [ChoiceIntent.USE_ITEM]: '使用物品或工具',
    [ChoiceIntent.COMMUNICATE]: '交流或呼叫',
    [ChoiceIntent.REST]: '休息恢复',
    [ChoiceIntent.RISKY_ACT]: '冒险行为',
};
//# sourceMappingURL=intent.js.map