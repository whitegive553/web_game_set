/**
 * Placeholder events for initial testing
 * These are intentionally simple and serve as examples
 */

import { GameEvent } from '@survival-game/shared';

/**
 * Initial entrance event
 */
export const EVENT_ENTRANCE: GameEvent = {
  id: 'event_entrance',
  type: 'EXPLORATION',
  location: 'ZONE_ENTRANCE',
  triggerConditions: [],
  descriptionTemplate:
    'You stand at the entrance of the Exclusion Zone. The air is thick with an unsettling silence. ' +
    'A rusted chain-link fence bears faded warning signs in multiple languages. ' +
    'Beyond it, the overgrown path disappears into shadow.',
  requiresLLM: false,
  priority: 100,
  oneTime: true,
  choices: [
    {
      id: 'choice_enter',
      text: 'Enter the zone',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_enter',
            stateChanges: [
              { target: 'visible', key: 'currentLocation', operation: 'SET', value: 'ZONE_CORRIDOR' },
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 5 }
            ],
            narrativeTemplate:
              'You slip through a gap in the fence. The silence becomes even more oppressive. ' +
              'You can feel... something... watching.',
            requiresLLM: false,
            nextEventId: 'event_corridor_01'
          }
        }
      ]
    },
    {
      id: 'choice_observe',
      text: 'Observe carefully before entering',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_observe',
            stateChanges: [
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 2 },
              { target: 'flags', key: 'observed_entrance', operation: 'SET', value: true }
            ],
            narrativeTemplate:
              'You take time to study the area. You notice strange markings on some trees - ' +
              'claw marks? Or something else? This information might be useful.',
            requiresLLM: false,
            nextEventId: 'event_entrance_observed'
          }
        }
      ]
    }
  ]
};

/**
 * Corridor exploration event
 */
export const EVENT_CORRIDOR_01: GameEvent = {
  id: 'event_corridor_01',
  type: 'EXPLORATION',
  location: 'ZONE_CORRIDOR',
  triggerConditions: [],
  descriptionTemplate:
    'The corridor is narrow and dark. Vegetation has reclaimed much of the concrete. ' +
    'You hear distant sounds - wind? Or something else?',
  requiresLLM: false,
  priority: 50,
  oneTime: false,
  choices: [
    {
      id: 'choice_move_quickly',
      text: 'Move quickly through',
      requirements: [
        { type: 'STAT', key: 'visible.stamina', operator: 'GT', value: 20 }
      ],
      outcomes: [
        {
          weight: 70,
          outcome: {
            id: 'outcome_quick_success',
            stateChanges: [
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 15 },
              { target: 'visible', key: 'currentLocation', operation: 'SET', value: 'ZONE_CHAMBER' }
            ],
            narrativeTemplate:
              'You move swiftly through the corridor. Your heart pounds, but you make it through safely.',
            requiresLLM: false,
            nextEventId: 'event_chamber_01'
          }
        },
        {
          weight: 30,
          outcome: {
            id: 'outcome_quick_accident',
            stateChanges: [
              { target: 'visible', key: 'health', operation: 'SUBTRACT', value: 20 },
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 10 }
            ],
            narrativeTemplate:
              'In your haste, you trip over debris. Sharp metal cuts your leg. The pain is intense.',
            requiresLLM: false
          }
        }
      ]
    },
    {
      id: 'choice_move_carefully',
      text: 'Move carefully and quietly',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_careful',
            stateChanges: [
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 8 },
              { target: 'hidden', key: 'observationLevel', operation: 'ADD', value: 5 },
              { target: 'visible', key: 'currentLocation', operation: 'SET', value: 'ZONE_CHAMBER' }
            ],
            narrativeTemplate:
              'You proceed with caution. You notice fresh scratches on the walls. Something has been here recently.',
            requiresLLM: false,
            nextEventId: 'event_chamber_01'
          }
        }
      ]
    }
  ]
};

/**
 * Chamber encounter - higher stakes
 */
export const EVENT_CHAMBER_01: GameEvent = {
  id: 'event_chamber_01',
  type: 'ENCOUNTER',
  location: 'ZONE_CHAMBER',
  triggerConditions: [],
  descriptionTemplate:
    'You enter a large chamber. The ceiling is partially collapsed. In the corner, ' +
    'you see what appears to be a supply cache - but also signs of recent disturbance.',
  requiresLLM: false,
  priority: 80,
  oneTime: true,
  choices: [
    {
      id: 'choice_investigate_cache',
      text: 'Investigate the supply cache',
      requirements: [],
      outcomes: [
        {
          weight: 60,
          outcome: {
            id: 'outcome_find_supplies',
            stateChanges: [
              { target: 'visible', key: 'supplies', operation: 'ADD', value: 20 },
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 5 }
            ],
            narrativeTemplate:
              'You find useful supplies: water, some rations, and a flashlight. Lucky.',
            requiresLLM: false
          }
        },
        {
          weight: 40,
          outcome: {
            id: 'outcome_trap',
            stateChanges: [
              { target: 'visible', key: 'health', operation: 'SUBTRACT', value: 40 },
              { target: 'hidden', key: 'sanity', operation: 'SUBTRACT', value: 15 }
            ],
            narrativeTemplate:
              'As you reach for the supplies, something snaps. Pain explodes in your hand. ' +
              'A makeshift trap. You hear laughter - or is it the wind?',
            requiresLLM: false,
            deathType: 'INSTANT'
          }
        }
      ]
    },
    {
      id: 'choice_leave',
      text: 'Leave immediately',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_retreat',
            stateChanges: [
              { target: 'flags', key: 'cautious_nature', operation: 'SET', value: true }
            ],
            narrativeTemplate:
              'Your instincts tell you to leave. Sometimes the best choice is to walk away.',
            requiresLLM: false,
            endsGame: true
          }
        }
      ]
    }
  ]
};

/**
 * Alternative entrance path (if observed first)
 */
export const EVENT_ENTRANCE_OBSERVED: GameEvent = {
  id: 'event_entrance_observed',
  type: 'EXPLORATION',
  location: 'ZONE_ENTRANCE',
  triggerConditions: [
    { type: 'FLAG', key: 'observed_entrance', operator: 'EQ', value: true }
  ],
  descriptionTemplate:
    'Having observed the area, you feel slightly more prepared. You notice a less obvious path ' +
    'that might be safer.',
  requiresLLM: false,
  priority: 90,
  oneTime: true,
  choices: [
    {
      id: 'choice_safe_path',
      text: 'Take the safer path',
      requirements: [],
      outcomes: [
        {
          weight: 100,
          outcome: {
            id: 'outcome_safe_entry',
            stateChanges: [
              { target: 'visible', key: 'currentLocation', operation: 'SET', value: 'ZONE_CORRIDOR' },
              { target: 'visible', key: 'stamina', operation: 'SUBTRACT', value: 3 },
              { target: 'hidden', key: 'observationLevel', operation: 'SUBTRACT', value: 5 }
            ],
            narrativeTemplate:
              'The alternate path proves wise. You enter more safely, though it took longer.',
            requiresLLM: false,
            nextEventId: 'event_corridor_01'
          }
        }
      ]
    }
  ]
};

/**
 * All placeholder events
 */
export const PLACEHOLDER_EVENTS: GameEvent[] = [
  EVENT_ENTRANCE,
  EVENT_CORRIDOR_01,
  EVENT_CHAMBER_01,
  EVENT_ENTRANCE_OBSERVED
];
