# Survival Narrative Game - Technical Framework

A web-based text interaction survival narrative game with rule-driven gameplay and LLM-assisted storytelling.

## Project Philosophy

This is a **rules-driven + LLM-assisted narrative** game where:

- **Rules engine is the core** - All state changes, success/failure, and numerical values are determined by deterministic code
- **LLM is a narrative tool** - Used only for text generation and atmospheric description
- **Failure is expected** - Death is common, but provides long-term value through persistent knowledge
- **State machine architecture** - Game progresses through: `State → Event → Choice → Outcome → New State`

## Project Structure

```
web_llm/
├── packages/
│   ├── shared/              # Shared types and constants
│   │   └── src/
│   │       ├── types/       # Core type definitions
│   │       ├── constants.ts # Game constants
│   │       └── index.ts
│   │
│   ├── game-engine/         # Core game logic (rules engine)
│   │   └── src/
│   │       ├── core/        # Core systems
│   │       │   ├── condition-evaluator.ts  # Evaluates game conditions
│   │       │   ├── state-modifier.ts       # Applies state changes
│   │       │   └── event-selector.ts       # Selects events based on state
│   │       ├── data/        # Game content
│   │       │   └── placeholder-events.ts   # Example events
│   │       ├── game-engine.ts              # Main engine class
│   │       └── index.ts
│   │
│   ├── server/              # Backend API server
│   │   └── src/
│   │       ├── services/
│   │       │   ├── llm-service-mock.ts     # Mock LLM (for testing)
│   │       │   └── game-session-manager.ts # Manages game sessions
│   │       ├── routes/
│   │       │   └── game-routes.ts          # API endpoints
│   │       └── index.ts
│   │
│   └── client/              # Frontend React application
│       └── src/
│           ├── components/
│           │   ├── GameUI.tsx              # Main UI component
│           │   └── GameUI.css
│           ├── services/
│           │   └── api.ts                  # API client
│           ├── App.tsx
│           └── main.tsx
│
├── package.json             # Root package (monorepo)
└── README.md               # This file
```

## Core Abstractions

### 1. GameState
The complete state of a game session:
- Current phase (EXPLORATION, EVENT, CHOICE, OUTCOME, DEATH, etc.)
- Player state (visible and hidden stats)
- Current event
- History and turn count

### 2. PlayerState
All player-related data:
- **Visible stats**: health, stamina, supplies, location (player can see)
- **Hidden stats**: sanity, anomaly affinity, observation level (inferred through narrative)
- **Inventory**: items including rare anomalous artifacts
- **Persistent data**: survives death (explored locations, known anomalies, artifacts)

### 3. Event
A game situation that presents choices:
- Trigger conditions (when it can occur)
- Description template (for LLM or direct display)
- Available choices
- Location and priority

### 4. Choice
An action the player can take:
- Display text
- Requirements (conditions to be available)
- Weighted outcomes (probabilities)
- Rarely: allows natural language input

### 5. Outcome
The result of a choice:
- State changes (deterministic modifications)
- Next event trigger
- Narrative template
- Can end the game (death or evacuation)

### 6. LLMService
Abstract interface for text generation:
- Event descriptions
- Outcome narratives
- Death reviews
- Anomaly manifestations

**Critical**: LLM cannot modify game state or make gameplay decisions.

## Design Principles

### 1. Separation of Concerns
- **Game Engine** (`@survival-game/game-engine`): Pure game logic, no I/O
- **Server** (`@survival-game/server`): API and session management
- **Client** (`@survival-game/client`): UI and user interaction
- **Shared** (`@survival-game/shared`): Common types and constants

### 2. Deterministic Rules
All gameplay is governed by:
- Condition evaluation (pure functions)
- State modification (immutable patterns)
- Event selection (deterministic with seeded random)

### 3. Extensibility
The framework supports future additions:
- New zones and locations
- New event types
- New anomalous items
- Different LLM providers
- Cross-life progression systems

### 4. State Machine Architecture
```
INITIALIZATION → EXPLORATION → EVENT → CHOICE → OUTCOME
                                  ↓
                            DEATH or EVACUATION
                                  ↓
                      RESPAWN (with persistent data)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build shared packages:
```bash
cd packages/shared
npm run build
cd ../game-engine
npm run build
cd ../..
```

3. Set up environment variables:
```bash
cd packages/server
cp .env.example .env
# Edit .env if needed
cd ../..
```

### Running the Game

#### Option 1: Run both server and client together (recommended for development)
```bash
npm run dev
```

#### Option 2: Run separately

Terminal 1 - Start the server:
```bash
cd packages/server
npm run dev
```

Terminal 2 - Start the client:
```bash
cd packages/client
npm run dev
```

The game will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## API Endpoints

### `POST /api/game/new`
Creates a new game session
- Returns: `{ sessionId, gameState, availableChoices }`

### `GET /api/game/:sessionId/state`
Gets current game state
- Returns: `{ gameState, availableChoices }`

### `POST /api/game/:sessionId/choice`
Makes a choice
- Body: `{ choiceId }`
- Returns: `{ gameState, availableChoices }`

### `POST /api/game/:sessionId/respawn`
Respawns after death
- Returns: `{ gameState, availableChoices }`

### `DELETE /api/game/:sessionId`
Deletes a session

## Extending the Game

### Adding New Events

Create events in `packages/game-engine/src/data/`:

```typescript
export const MY_NEW_EVENT: GameEvent = {
  id: 'my_event',
  type: 'EXPLORATION',
  location: 'ZONE_ENTRANCE',
  triggerConditions: [
    { type: 'STAT', key: 'visible.health', operator: 'GT', value: 50 }
  ],
  descriptionTemplate: 'Your event description...',
  requiresLLM: false,
  priority: 50,
  oneTime: false,
  choices: [
    {
      id: 'choice_1',
      text: 'Do something',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_1',
            stateChanges: [
              { target: 'visible', key: 'health', operation: 'SUBTRACT', value: 10 }
            ],
            narrativeTemplate: 'Result description...',
            requiresLLM: false
          }
        }
      ]
    }
  ]
};
```

Register in `packages/server/src/services/game-session-manager.ts`:
```typescript
engine.registerEvents([...PLACEHOLDER_EVENTS, MY_NEW_EVENT]);
```

### Adding New LLM Providers

Implement the `ILLMService` interface:

```typescript
export class OpenAILLMService implements ILLMService {
  async generateText(request: LLMRequest): Promise<LLMResponse> {
    // Your implementation
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}
```

### Adding New Stats

1. Add to types in `packages/shared/src/types/core.ts`
2. Add default values in `packages/shared/src/constants.ts`
3. Update UI in `packages/client/src/components/GameUI.tsx` (for visible stats)

## Current State

This is a **minimal viable framework**. It includes:

- Complete type system
- Working game engine with state machine
- 4 placeholder events demonstrating:
  - Basic exploration
  - Choice consequences
  - Risk/reward decisions
  - Death mechanics
  - Conditional branching
- REST API server
- Basic React UI
- Session management

## What's NOT Implemented (By Design)

These are intentionally left for future development:

- Real LLM integration (currently using mock)
- Extensive game content and events
- Multiple zones and locations
- Complex anomalous items
- Natural language input system
- Save/load functionality
- Detailed death review narratives
- Hidden stat visualization hints
- Sound and visual effects

## Architecture Decisions

### Why Monorepo?
- Shared types stay in sync
- Easy to refactor across packages
- Simplified dependency management

### Why TypeScript Everywhere?
- Type safety across client/server boundary
- Better IDE support
- Catches errors early

### Why Separate Game Engine?
- Can be tested independently
- Could be used in different contexts (CLI, Discord bot, etc.)
- Pure logic, no framework coupling

### Why Mock LLM by Default?
- Development doesn't require API keys
- Faster iteration
- Cost-effective testing
- Easy to swap with real implementation

## Next Steps

To turn this framework into a complete game:

1. **Add more events** - Create a rich event library
2. **Implement real LLM** - Replace mock with OpenAI/Anthropic
3. **Design zones** - Plan out different areas with unique characteristics
4. **Create anomalous items** - Design rare cross-life items
5. **Implement save system** - Persist game state to database
6. **Enhance UI** - Add animations, sound, better visual feedback
7. **Balance difficulty** - Tune stats and probabilities
8. **Write narrative content** - Craft compelling stories and descriptions

## License

Private project - All rights reserved

---

**Remember**: This is a framework, not a complete game. The power is in the extensibility and clear separation of concerns. Focus on creating great content within this structure.
