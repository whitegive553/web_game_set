# Prompt Template System

This directory contains all LLM prompt templates and their associated schemas for structured input/output validation.

## Directory Structure

```
prompts/
  templates/          # Prompt template files
    scene_and_choices.prompt.md
  schemas/            # JSON schemas for validation
    llm_input.schema.json
    llm_output.schema.json
  README.md           # This file
```

## Purpose

The Prompt Template System serves to:

1. **Centralize Prompt Management**: All LLM prompts are stored as template files, not scattered in business logic code
2. **Enforce Structure**: Input and output are validated against JSON schemas
3. **Enable Reusability**: Templates use placeholders for dynamic content injection
4. **Maintain Control**: LLM is strictly constrained to narrative generation only

## Core Principles

### LLM Role Boundaries

The LLM is **NOT** the game engine. It has these strict limitations:

- **Cannot** decide numerical stat changes
- **Cannot** decide success or failure outcomes
- **Cannot** maintain game state
- **Cannot** determine probabilities

The LLM's **ONLY** job:

- Generate atmospheric narrative text
- Generate player choice options
- Return structured JSON output

### Template System

#### Placeholders

Templates use double-brace placeholders for content injection:

- `{{CONTEXT_JSON}}` - Injected with complete game context
- `{{CONSTRAINTS_JSON}}` - Injected with generation constraints

#### Rendering Process

1. Backend reads template file
2. PromptRenderer replaces placeholders with JSON-stringified context
3. Final prompt sent to LLM
4. LLM response validated against output schema

## Available Templates

### `scene_and_choices.prompt.md`

**Purpose**: Generate narrative text and player choices for current game step

**Input Requirements**:
- Scene context (ID, name, theme, danger level)
- Player state (visible stats, inventory, vault items)
- History (recent 8 actions with consequences)
- Meta information (step count, failure count, run ID)
- Constraints (min/max choices, tone, language, outcome restrictions)

**Output Structure**:
- Narrative text with atmospheric description
- 2-4 player choices with vague risk hints
- Descriptive tags for telemetry

**Tone**: Cold, uncertain, environmental. No explicit success/failure guarantees.

## Schema Validation

### Input Schema (`llm_input.schema.json`)

Validates the JSON structure sent TO the LLM. Ensures all required context is present and properly formatted.

**Required Fields**:
- `promptType`: Type of generation request
- `context`: Complete game context
  - `scene`: Scene metadata
  - `player`: Player state summary
  - `history`: Recent action history (max 8)
  - `meta`: Step count, failure count, run ID
- `constraints`: Generation parameters

### Output Schema (`llm_output.schema.json`)

Validates the JSON structure RETURNED by the LLM. Ensures response matches expected format.

**Required Fields**:
- `narrative`: Object with `text` (string) and `source` (enum)
- `choices`: Array of 2-4 choice objects
  - Each choice: `id`, `text`, `riskHint`
  - IDs must follow pattern `choice_N`
- `tags`: Array of 1-3 descriptive tags

### Validation Enforcement

- All LLM calls must pass input through schema validator before sending
- All LLM responses must pass output through schema validator before use
- Invalid responses trigger fallback narrative system
- Validation errors logged for debugging

## Fallback Strategy

If LLM returns invalid JSON or fails schema validation:

1. Log raw LLM output for debugging
2. Use predefined fallback narrative for current scene
3. Generate generic choices based on scene type
4. Mark response as `usedFallback: true`
5. Continue game without breaking player experience

## Adding New Prompt Types

To add a new prompt template:

1. Create template file in `templates/`
2. Define required placeholders
3. Create/update input schema if needed
4. Create/update output schema
5. Implement schema validator
6. Add fallback strategy
7. Update this README

## Usage Example

```typescript
// 1. Build context
const context = contextBuilder.build(gameState, scene);

// 2. Render prompt
const prompt = promptRenderer.render('scene_and_choices', {
  CONTEXT_JSON: JSON.stringify(context.context),
  CONSTRAINTS_JSON: JSON.stringify(context.constraints)
});

// 3. Call LLM
const rawResponse = await llmClient.generate(prompt);

// 4. Validate
const validated = schemaValidator.validate(rawResponse, 'llm_output');

// 5. Use or fallback
if (validated.success) {
  return validated.output;
} else {
  return fallbackNarrative(scene);
}
```

## Design Decisions

### Why Templates in Files?

- Easier to edit without touching code
- Better version control and diff visibility
- Non-programmers can contribute to prompts
- Reduces risk of prompt injection in code

### Why JSON I/O?

- Structured, validatable, programmatic
- Prevents free-form text that's hard to parse
- Enables strict schema enforcement
- Better error handling and debugging

### Why Strict Role Boundaries?

- LLM generates flavor text only
- Game engine handles all logic and state
- Prevents non-deterministic gameplay
- Enables reliable testing and balancing

### Why Fallback Strategy?

- LLM APIs can fail or return invalid data
- Game must never break due to LLM issues
- Player experience must be seamless
- Graceful degradation is critical

## Future Expansion

Potential new prompt types:

- `death_summary.prompt.md` - Generate death recap and learning moments
- `item_description.prompt.md` - Generate atmospheric item descriptions
- `anomaly_manifestation.prompt.md` - Generate anomaly behavior descriptions
- `evacuation_ending.prompt.md` - Generate ending narratives
- `vault_reflection.prompt.md` - Generate cross-life reflection text

## References

- Input types: `packages/shared/src/types/llm.ts`
- Output types: `packages/shared/src/types/llm.ts`
- Renderer: `packages/server/src/services/prompt-renderer.ts`
- Validator: `packages/server/src/services/schema-validator.ts`
