"use strict";
/**
 * Avalon Game Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvalonPhase = exports.AvalonRole = exports.AvalonTeam = void 0;
// ============================================================================
// Roles and Teams
// ============================================================================
var AvalonTeam;
(function (AvalonTeam) {
    AvalonTeam["GOOD"] = "good";
    AvalonTeam["EVIL"] = "evil";
})(AvalonTeam || (exports.AvalonTeam = AvalonTeam = {}));
var AvalonRole;
(function (AvalonRole) {
    AvalonRole["MERLIN"] = "merlin";
    AvalonRole["PERCIVAL"] = "percival";
    AvalonRole["LOYAL_SERVANT"] = "loyal_servant";
    AvalonRole["ASSASSIN"] = "assassin";
    AvalonRole["MORGANA"] = "morgana";
    AvalonRole["MORDRED"] = "mordred";
    AvalonRole["OBERON"] = "oberon";
    AvalonRole["MINION"] = "minion";
})(AvalonRole || (exports.AvalonRole = AvalonRole = {}));
// ============================================================================
// Game Phases
// ============================================================================
var AvalonPhase;
(function (AvalonPhase) {
    AvalonPhase["LOBBY"] = "LOBBY";
    AvalonPhase["ROLE_REVEAL"] = "ROLE_REVEAL";
    AvalonPhase["NOMINATION"] = "NOMINATION";
    AvalonPhase["TEAM_VOTE"] = "TEAM_VOTE";
    AvalonPhase["QUEST_VOTE"] = "QUEST_VOTE";
    AvalonPhase["QUEST_RESULT"] = "QUEST_RESULT";
    AvalonPhase["ASSASSINATION"] = "ASSASSINATION";
    AvalonPhase["GAME_OVER"] = "GAME_OVER";
})(AvalonPhase || (exports.AvalonPhase = AvalonPhase = {}));
//# sourceMappingURL=avalon.js.map