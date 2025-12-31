"use strict";
/**
 * Shared types, constants, and utilities for the survival narrative game
 * This package is used by both server and client
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Core type exports
__exportStar(require("./types/core"), exports);
// Auth type exports
__exportStar(require("./types/auth"), exports);
// Save type exports
__exportStar(require("./types/save"), exports);
// LLM type exports (Phase 4)
__exportStar(require("./types/llm"), exports);
// Scene type exports (Phase 4)
__exportStar(require("./types/scene"), exports);
// Intent type exports (Phase 4 Enhanced)
__exportStar(require("./types/intent"), exports);
// Plot type exports (Phase 4 Enhanced)
__exportStar(require("./types/plot"), exports);
// Game Plugin System exports
__exportStar(require("./types/game-plugin"), exports);
// Avalon Game exports
__exportStar(require("./types/avalon"), exports);
__exportStar(require("./avalon-config-utils"), exports);
__exportStar(require("./types/avalon-history"), exports);
// Constants exports
__exportStar(require("./constants"), exports);
//# sourceMappingURL=index.js.map