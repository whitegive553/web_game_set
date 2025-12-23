# Architecture Documentation

## System Overview

This document describes the architectural decisions and design patterns used in the Survival Narrative Game framework.

## Core Design Philosophy

### Rules-First, LLM-Second

The game is fundamentally a **deterministic state machine** with LLM enhancement for narrative quality.

```
┌─────────────────────────────────────────────────────┐
│                   Game Flow                         │
│                                                     │
│  Current State ──→ Event ──→ Choice ──→ Outcome    │
│       ↑                                    │        │
│       └────────── New State ───────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Why this matters**:
- Predictable, testable game logic
- LLM failures don't break gameplay
- Can run with or without LLM
- Clear debugging path

### State Immutability

All state modifications create new state objects rather than mutating existing ones.

```typescript
// ✓ Correct - immutable
const newState = applyStateChange(currentState, change);

// ✗ Wrong - mutation
currentState.health -= 10;
```

**Benefits**:
- Time-travel debugging possible
- Easier to implement undo/replay
- Prevents accidental state corruption
- Clear data flow

### Condition-Based Event System

Events don't "call" other events. Instead:

1. Events specify their trigger conditions
2. Engine evaluates all possible events
3. Highest priority valid event is selected

```typescript
interface GameEvent {
  triggerConditions: Condition[];  // When this can happen
  priority: number;                // If multiple valid, which wins
  oneTime: boolean;                // Can only happen once
}
```

**Why not direct event chains?**:
- More flexible (multiple paths to same event)
- Emergent gameplay from condition interactions
- Easier to add new events without breaking existing ones
- Better for non-linear narratives

## Package Structure

### @survival-game/shared

**Purpose**: Common types and constants used by all packages

**Key exports**:
- Type definitions (GameState, PlayerState, Event, etc.)
- Constants (default values, limits)
- Interfaces (ILLMService)

**Dependencies**: None

**Why separate?**:
- Single source of truth for types
- Prevents circular dependencies
- Easy to keep client/server in sync

### @survival-game/game-engine

**Purpose**: Pure game logic with zero dependencies on I/O or frameworks

**Architecture**:
```
GameEngine (orchestrator)
    ├── ConditionEvaluator (pure functions)
    ├── StateModifier (pure functions)
    └── EventSelector (pure functions)
```

**Key principles**:
- No network calls
- No file system access
- No timers or async operations (except for interface contracts)
- All functions are deterministic (except seeded random)

**Why pure?**:
- Can run in browser, Node, or anywhere JavaScript runs
- Easy to unit test
- Could power different UIs (CLI, Discord bot, etc.)
- Performance (no I/O blocking)

### @survival-game/server

**Purpose**: HTTP API and game session management

**Responsibilities**:
- Session lifecycle (create, retrieve, expire)
- API endpoint handling
- LLM service integration
- State persistence (future)

**Not responsible for**:
- Game logic (delegated to engine)
- UI rendering (delegated to client)

**Why separate server?**:
- Could support multiplayer in future
- Centralized game state management
- LLM calls from server (API key security)
- Session timeout and cleanup

### @survival-game/client

**Purpose**: React-based user interface

**Architecture**:
```
App
 └── GameUI (main component)
      ├── Status display
      ├── Event rendering
      ├── Choice buttons
      └── API communication
```

**Design pattern**: Smart component
- Manages own state (gameState, loading, errors)
- Handles API calls
- Renders based on GamePhase

**Why React?**:
- Component-based architecture fits game phases
- Good TypeScript support
- Large ecosystem for future enhancements
- Familiar to most developers

## Data Flow

### Complete Request Flow

```
User clicks choice
    ↓
GameUI.makeChoice(choiceId)
    ↓
API.makeChoice(sessionId, choiceId)
    ↓
[HTTP POST to server]
    ↓
gameRoutes.post('/:sessionId/choice')
    ↓
SessionManager.getSession(sessionId)
    ↓
GameEngine.makeChoice(choiceId)
    ├── Validate choice requirements
    ├── Select outcome (weighted random)
    ├── Apply state changes
    ├── Check for death/end
    └── Select next event
    ↓
Return new GameState
    ↓
[HTTP response]
    ↓
GameUI updates state
    ↓
React re-renders
```

### State Ownership

```
┌─────────────────────────────────────────┐
│  Client                                 │
│  ┌────────────────────────────────────┐ │
│  │ Local State                        │ │
│  │ - sessionId                        │ │
│  │ - gameState (cached copy)          │ │
│  │ - loading/error states             │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                  ↕ HTTP
┌─────────────────────────────────────────┐
│  Server                                 │
│  ┌────────────────────────────────────┐ │
│  │ Session Store (Map)                │ │
│  │ - sessionId → GameEngine instance  │ │
│  │ - GameEngine owns GameState        │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Why not server-side rendering?**:
- Clear client/server separation
- Could add multiple clients (mobile app, CLI)
- Better user experience (instant UI updates)
- Simplified deployment

## Key Algorithms

### Condition Evaluation

Conditions are evaluated in a specific order for performance:

1. **STAT checks** - Fastest (simple number comparison)
2. **FLAG checks** - Fast (boolean lookup)
3. **LOCATION checks** - Fast (string comparison)
4. **ITEM checks** - Slower (array search)
5. **RANDOM checks** - Last (involves RNG)

All conditions must pass (AND logic). This is intentional:
- Forces specific, well-defined events
- Prevents overly broad triggers
- Makes event behavior predictable

Future: Could add OR conditions if needed.

### Event Selection Priority

When multiple events can trigger:

```typescript
1. Filter to valid events (conditions met, not expired, correct location)
2. Sort by priority (descending)
3. Take highest priority event
```

**Why not weighted random selection?**:
- More predictable for testing
- Priority allows important story beats to take precedence
- Still allows randomness through RANDOM conditions
- Can layer weighted selection on top if needed

### Outcome Selection

From a choice's possible outcomes:

```typescript
1. Sum total weights
2. Generate random number [0, totalWeight)
3. Iterate through outcomes, accumulating weights
4. Return first outcome where cumulative >= random
```

**Seeded random (TODO)**:
Currently uses `Math.random()`, but architecture supports seeded random based on:
- Turn count
- Player state hash
- Session ID

Benefits of seeded random:
- Reproducible for debugging
- Could support replay/analysis
- Deterministic testing

## State Machine

### Phase Transitions

```
INITIALIZATION
    ↓
EXPLORATION (select first event)
    ↓
EVENT (display event description)
    ↓
CHOICE (player selects option)
    ↓
OUTCOME (apply state changes)
    ↓
┌───────────────┐
│ Check Results │
└───────────────┘
    ↓
    ├─→ DEATH (if health <= 0 or endsGame=true with death)
    │       ↓
    │   [Respawn] → EXPLORATION (new life)
    │
    ├─→ EVACUATION (if endsGame=true without death)
    │       ↓
    │   ENDED
    │
    └─→ Next Event → EVENT (continue)
```

### Phase-Specific Logic

**INITIALIZATION**:
- Set up starting state
- No UI yet

**EXPLORATION**:
- System phase (not shown to user)
- Selects next event
- Immediately transitions to EVENT

**EVENT**:
- Display event description
- Load available choices
- Wait for player input

**CHOICE**:
- Brief phase while processing
- Validates choice
- Selects outcome

**OUTCOME**:
- Apply state changes
- Display outcome narrative
- Determine next phase

**DEATH**:
- Display death information
- Show persistent data
- Offer respawn option

**EVACUATION/ENDED**:
- Success state
- Show statistics
- Offer new game

## Extension Points

### Adding New Event Types

Currently supported:
- EXPLORATION
- ENCOUNTER
- DISCOVERY
- ANOMALOUS
- ENVIRONMENTAL

To add new type:

1. Add to enum in `core.ts`:
```typescript
export enum EventType {
  // ... existing
  NEW_TYPE = 'NEW_TYPE'
}
```

2. Optionally add specific handling in EventSelector
3. Create events of new type
4. Update UI to handle type-specific rendering (optional)

### Adding New Stat Categories

Current structure:
- `visible` - Player can see
- `hidden` - Player cannot see

To add new category:

1. Add to PlayerState:
```typescript
interface PlayerState {
  visible: VisibleStats;
  hidden: HiddenStats;
  newCategory: NewStats;  // ← Add here
}
```

2. Update StateModifier to handle new target
3. Update default values in constants
4. Update UI if visible to player

### Implementing Real LLM

Replace `MockLLMService` with actual implementation:

```typescript
export class OpenAILLMService implements ILLMService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const prompt = this.buildPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: request.maxTokens || 300
      })
    });

    const data = await response.json();
    return { text: data.choices[0].message.content };
  }

  private buildPrompt(request: LLMRequest): string {
    // Build contextual prompt from request.context
    // Include: template, player state, recent events
    // Add instructions based on request.type
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
```

Update in `server/src/index.ts`:
```typescript
const llmService = process.env.OPENAI_API_KEY
  ? new OpenAILLMService(process.env.OPENAI_API_KEY)
  : new MockLLMService();
```

## Performance Considerations

### Session Storage

Current: In-memory Map
- Fast
- Simple
- Sessions lost on server restart

Production should use:
- Redis (for distributed systems)
- Database with TTL (for persistence)

### Event Registration

Events are registered once at engine creation:
```typescript
const engine = new GameEngine();
engine.registerEvents(ALL_EVENTS);  // ← One time
```

Not re-registered per decision. This is important for performance.

### State Copying

Current implementation uses `JSON.parse(JSON.stringify())` for deep cloning.

This is:
- Simple
- Correct
- Good enough for current scale

For large states, consider:
- Structural sharing (Immutable.js)
- Partial state updates
- Memoization

## Security Considerations

### Input Validation

All user inputs are validated:
- Choice ID must exist
- Choice requirements must be met
- Session ID must be valid

### Session Isolation

Each session has its own GameEngine instance. State cannot leak between sessions.

### LLM Prompt Injection

When implementing real LLM:
- Never put user input directly in system prompts
- Validate LLM outputs before displaying
- Set appropriate max_tokens limits
- Consider rate limiting

### API Rate Limiting

Currently not implemented. Production should add:
- Per-IP rate limiting
- Per-session rate limiting
- DDoS protection

## Testing Strategy

### Unit Tests (Recommended)

**Game Engine**:
- Test each condition type
- Test state modifications
- Test event selection logic
- Test outcome selection distribution

**API Routes**:
- Test all endpoints
- Test error cases
- Test session lifecycle

### Integration Tests

- Full game flow: create → choice → outcome → death → respawn
- LLM integration (with real service)
- Client API calls

### Manual Testing Checklist

- [ ] Can start new game
- [ ] Can make choices
- [ ] Stats update correctly
- [ ] Death triggers appropriately
- [ ] Respawn works
- [ ] Session expiration works
- [ ] UI displays all phases correctly

## Future Architectural Enhancements

### Database Integration

For production persistence:

```
GameState (in-memory)
    ↓
On significant changes
    ↓
Save to Database
    - Player progress
    - Persistent data
    - Session state
```

### Multiplayer Support

Could extend to support:
- Shared world state
- Player interactions
- Leaderboards

Would require:
- Shared state management
- Event broadcasting
- Conflict resolution

### Real-time Features

WebSocket support for:
- Live state updates
- Multiplayer events
- Admin monitoring

## Conclusion

This architecture prioritizes:

1. **Clarity** - Easy to understand and modify
2. **Extensibility** - Simple to add content
3. **Testability** - Pure functions and clear contracts
4. **Flexibility** - Can evolve without major rewrites

The framework is intentionally minimal to serve as a solid foundation, not a complete game. Build your game's unique features on top of this structure.
