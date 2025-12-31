"use strict";
/**
 * Core type definitions for the survival narrative game
 * These types define the fundamental abstractions of the game system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePhase = void 0;
// ============================================================================
// Game Phase - Represents the current stage of the game loop
// ============================================================================
var GamePhase;
(function (GamePhase) {
    GamePhase["INITIALIZATION"] = "INITIALIZATION";
    GamePhase["EXPLORATION"] = "EXPLORATION";
    GamePhase["EVENT"] = "EVENT";
    GamePhase["CHOICE"] = "CHOICE";
    GamePhase["OUTCOME"] = "OUTCOME";
    GamePhase["DEATH"] = "DEATH";
    GamePhase["EVACUATION"] = "EVACUATION";
    GamePhase["ENDED"] = "ENDED"; // Game session ended
})(GamePhase || (exports.GamePhase = GamePhase = {}));
//# sourceMappingURL=core.js.map