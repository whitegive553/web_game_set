/**
 * Mock game data for UI development
 * This will be replaced with real API calls later
 */

import { Narrative, Choice, EventLogEntry, InventoryItem } from '../types/game';

// ============================================================================
// Mock Narratives
// ============================================================================

export const MOCK_NARRATIVES: Record<string, Narrative> = {
  entrance: {
    id: 'entrance',
    speaker: '记录',
    text: '你站在禁区入口。生锈的铁丝网上挂着多国语言的警告标识。空气中弥漫着一种难以名状的寂静。越过这道栅栏，你将进入一个规则不再适用的领域。',
    location: '禁区入口',
    timestamp: Date.now()
  },

  corridor: {
    id: 'corridor',
    speaker: '记录',
    text: '走廊狭窄而阴暗。植被从破裂的混凝土中生长出来。你听到远处的声音——是风，还是别的什么？墙上有新鲜的抓痕。',
    location: '走廊',
    timestamp: Date.now()
  },

  chamber: {
    id: 'chamber',
    speaker: '记录',
    text: '你进入一个大厅。天花板部分坍塌。角落里有一个补给箱，但周围有被扰动的痕迹。这可能是陷阱，也可能是救命的资源。',
    location: '大厅',
    timestamp: Date.now()
  },

  death: {
    id: 'death',
    speaker: '系统',
    text: '黑暗吞噬了你。但知识会留存。那些你见过的异常，那些你探索过的地点，都将成为下一次的指引。',
    location: '未知',
    timestamp: Date.now()
  }
};

// ============================================================================
// Mock Choices
// ============================================================================

export const MOCK_CHOICE_SETS: Record<string, Choice[]> = {
  entrance: [
    {
      id: 'enter_direct',
      text: '直接进入禁区'
    },
    {
      id: 'observe_first',
      text: '先观察周围环境'
    },
    {
      id: 'retreat',
      text: '撤退（结束探索）',
      warning: '你将放弃本次探索'
    }
  ],

  corridor: [
    {
      id: 'move_fast',
      text: '快速通过走廊',
      disabled: false
    },
    {
      id: 'move_careful',
      text: '谨慎缓慢移动'
    },
    {
      id: 'investigate_marks',
      text: '调查墙上的抓痕',
      warning: '这可能很危险'
    }
  ],

  chamber: [
    {
      id: 'open_cache',
      text: '打开补给箱'
    },
    {
      id: 'leave_immediately',
      text: '立即离开'
    }
  ]
};

// ============================================================================
// Mock Event Log
// ============================================================================

export const MOCK_EVENT_LOG: EventLogEntry[] = [
  {
    id: 'log_1',
    turn: 1,
    location: '禁区入口',
    summary: '进入禁区边界',
    timestamp: Date.now() - 300000
  },
  {
    id: 'log_2',
    turn: 2,
    location: '走廊',
    summary: '发现异常抓痕',
    timestamp: Date.now() - 180000
  },
  {
    id: 'log_3',
    turn: 3,
    location: '大厅',
    summary: '遭遇补给箱陷阱',
    timestamp: Date.now() - 60000
  }
];

// ============================================================================
// Mock Inventory Items
// ============================================================================

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'item_flashlight',
    name: '手电筒',
    description: '一个普通的手电筒。电池还有70%。',
    type: 'NORMAL',
    isAnomalous: false,
    persistsAcrossDeaths: false
  },
  {
    id: 'item_note',
    name: '破损笔记',
    description: '前人留下的笔记。上面记载着一些奇怪的规则。',
    type: 'NORMAL',
    isAnomalous: false,
    persistsAcrossDeaths: false
  },
  {
    id: 'item_anomaly_shard',
    name: '？？？碎片',
    description: '一个无法用常理解释的物品。它似乎能记住你。',
    type: 'ANOMALOUS',
    isAnomalous: true,
    persistsAcrossDeaths: true
  }
];

// ============================================================================
// Mock Initial State
// ============================================================================

export const MOCK_INITIAL_STATE = {
  stats: {
    health: 100,
    stamina: 85,
    sanity: 90,
    supplies: 50
  },
  location: '禁区入口',
  turnCount: 1
};
