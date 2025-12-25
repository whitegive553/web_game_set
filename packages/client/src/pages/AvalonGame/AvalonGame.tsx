/**
 * Avalon Game - Main Game Interface
 * Complete game flow with all phases
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getWebSocketClient } from '../../services/websocket-client';
import { API_CONFIG } from '../../config/api';
import { QuestCard } from '../../components/QuestCard/QuestCard';
import './AvalonGame.css';

interface Player {
  userId: string;
  username: string;
  ready?: boolean;
  connected?: boolean;
}

interface QuestResult {
  questNumber: number;
  team: string[];
  successVotes: number;
  failVotes: number;
  success: boolean;
}

interface PublicState {
  phase: string;
  round: number;
  leader: string;
  questResults: QuestResult[];
  goodWins: number;
  evilWins: number;
  nominatedTeam?: string[];
  teamVotes?: Record<string, boolean>;
  questVoteCount?: {
    success: number;
    fail: number;
  };
  winner?: string;
  winReason?: string;
}

interface PrivateState {
  userId: string;
  role: string;
  team: string;
  evilPlayers?: string[];
  merlinCandidates?: string[];
  hasVotedQuest?: boolean;
}

export const AvalonGame: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [privateState, setPrivateState] = useState<PrivateState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Game start states
  const [countdown, setCountdown] = useState(5);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [roleCardFlipped, setRoleCardFlipped] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);

  // Reset countdown when phase changes to ROLE_REVEAL
  useEffect(() => {
    if (publicState?.phase === 'ROLE_REVEAL' && !countdownStarted) {
      console.log('[AvalonGame] Starting countdown from 5');
      setCountdown(5);
      setCountdownStarted(true);
      setShowRoleReveal(false);
      setRoleConfirmed(false);
    } else if (publicState?.phase !== 'ROLE_REVEAL') {
      setCountdownStarted(false);
    }
  }, [publicState?.phase, countdownStarted]);

  // Countdown timer for game start
  useEffect(() => {
    if (publicState?.phase === 'ROLE_REVEAL' && !roleConfirmed && countdown > 0 && countdownStarted) {
      console.log('[AvalonGame] Countdown:', countdown);
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !showRoleReveal && countdownStarted) {
      console.log('[AvalonGame] Countdown finished, showing role reveal');
      setShowRoleReveal(true);
    }
  }, [countdown, publicState?.phase, roleConfirmed, showRoleReveal, countdownStarted]);

  // Fetch game state
  useEffect(() => {
    if (!token || !matchId) return;

    fetchGameState();
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [token, matchId]);

  // Listen to WebSocket events
  useEffect(() => {
    const wsClient = getWebSocketClient();
    if (!wsClient) return;

    wsClient.on('GAME_EVENT', handleGameEvent);
    wsClient.on('PRIVATE_STATE', handlePrivateState);

    return () => {
      wsClient.off('GAME_EVENT', handleGameEvent);
      wsClient.off('PRIVATE_STATE', handlePrivateState);
    };
  }, []);

  const handleGameEvent = (payload: any) => {
    console.log('[AvalonGame] Game event:', payload);
    fetchGameState();
  };

  const handlePrivateState = (payload: any) => {
    console.log('[AvalonGame] Private state:', payload);
    if (payload.payload) {
      setPrivateState(payload.payload);
    } else {
      setPrivateState(payload);
    }
  };

  const fetchGameState = async () => {
    if (!token || !matchId) return;

    try {
      const response = await fetch(`${API_CONFIG.AVALON_API}/${matchId}/state`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPublicState(data.data.publicState);
        setPrivateState(data.data.privateState);
        const playersData = data.data.players || [];
        setPlayers(playersData);
        console.log('[AvalonGame] Fetched state - players:', playersData.length, playersData);
      } else if (response.status === 404 || data.gameEnded) {
        // Game not found or ended, redirect to lobby
        console.warn('[AvalonGame] Game not found or ended, redirecting to lobby');
        setError('游戏已结束或找不到');
        setTimeout(() => {
          navigate('/lobby');
        }, 2000);
      }
    } catch (error) {
      console.error('[AvalonGame] Fetch state error:', error);
    }
  };

  const performAction = async (type: string, payload: any) => {
    if (!token || !matchId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.AVALON_API}/${matchId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, payload })
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Action failed');
      } else {
        fetchGameState(); // Refresh state after successful action
      }
    } catch (error) {
      console.error('[AvalonGame] Action error:', error);
      setError('Failed to perform action');
    } finally {
      setLoading(false);
      setSelectedPlayers([]);
    }
  };

  const togglePlayerSelection = (userId: string) => {
    if (selectedPlayers.includes(userId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== userId));
    } else {
      const teamSize = getTeamSize();
      if (selectedPlayers.length < teamSize) {
        setSelectedPlayers([...selectedPlayers, userId]);
      }
    }
  };

  const nominateTeam = () => {
    performAction('NOMINATE_TEAM', { teamUserIds: selectedPlayers });
  };

  const voteTeam = (approve: boolean) => {
    performAction('VOTE_TEAM', { approve });
  };

  const voteQuest = (success: boolean) => {
    performAction('VOTE_QUEST', { success });
  };

  const assassinate = (targetUserId: string) => {
    performAction('ASSASSINATE', { targetUserId });
  };

  const handleExitGame = async () => {
    if (!token) return;

    // Confirm before exiting
    if (!window.confirm('确定要退出游戏吗？')) {
      return;
    }

    try {
      // First, try to find the room for this match
      const response = await fetch(`${API_CONFIG.LOBBY_API}/my-room`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success && data.data) {
        const roomId = data.data.roomId;

        // Leave the room
        await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/leave`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('[AvalonGame] Left room:', roomId);
      }
    } catch (error) {
      console.error('[AvalonGame] Error leaving room:', error);
    }

    // Navigate to lobby regardless of API result
    navigate('/lobby');
  };

  const getTeamSize = () => {
    const teamSizes: Record<number, number[]> = {
      6: [2, 3, 4, 3, 4],
      7: [2, 3, 3, 4, 4],
      8: [3, 4, 4, 5, 5],
      9: [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5]
    };

    const playerCount = players.length || 6;
    return teamSizes[playerCount]?.[publicState?.round ? publicState.round - 1 : 0] || 2;
  };

  const getPlayerName = (userId: string): string => {
    const player = players.find(p => p.userId === userId);
    return player?.username || userId;
  };

  const getRoleDisplayName = (role: string): string => {
    const roleNames: Record<string, string> = {
      'merlin': '梅林',
      'percival': '派西维尔',
      'loyal_servant': '忠臣',
      'assassin': '刺客',
      'morgana': '莫甘娜',
      'minion': '爪牙'
    };
    const displayName = roleNames[role] || role;
    console.log('[AvalonGame] Role display:', role, '->', displayName);
    return displayName;
  };

  const getPhaseText = (phase: string): string => {
    const phaseNames: Record<string, string> = {
      'LOBBY': '准备中',
      'ROLE_REVEAL': '角色揭示',
      'NOMINATION': '队长提名',
      'TEAM_VOTE': '队伍投票',
      'QUEST_VOTE': '任务投票',
      'ASSASSINATION': '刺杀梅林',
      'QUEST_RESULT': '任务结果',
      'GAME_OVER': '游戏结束'
    };
    return phaseNames[phase] || phase;
  };

  if (!publicState || !privateState) {
    return (
      <div className="avalon-game loading">
        <div className="loading-spinner"></div>
        <p>加载游戏中...</p>
      </div>
    );
  }

  // Countdown screen
  if (publicState.phase === 'ROLE_REVEAL' && !roleConfirmed) {
    if (countdown > 0) {
      return (
        <div className="avalon-game countdown-screen">
          <h1>游戏即将开始</h1>
          <div className="countdown-number">{countdown}</div>
          <p>请准备查看你的角色</p>
        </div>
      );
    }

    if (!showRoleReveal) {
      return (
        <div className="avalon-game loading">
          <p>准备中...</p>
        </div>
      );
    }

    // Role reveal screen
    return (
      <div className="avalon-game role-reveal-screen">
        <div className="role-reveal-content">
          <h1>你的角色</h1>
          <div className={`role-reveal-card ${privateState.team}`}>
            <div className="role-name-large">{getRoleDisplayName(privateState.role)}</div>
            <div className="role-team-large">
              {privateState.team === 'good' ? '善良阵营 ⚔️' : '邪恶阵营 ⚔️'}
            </div>

            {/* Special Info */}
            {privateState.evilPlayers && privateState.evilPlayers.length > 0 && (
              <div className="role-special-info">
                <p className="info-label">你知道的邪恶玩家：</p>
                {privateState.evilPlayers.map(playerId => (
                  <div key={playerId} className="info-player">
                    {getPlayerName(playerId)}
                  </div>
                ))}
              </div>
            )}

            {privateState.merlinCandidates && privateState.merlinCandidates.length > 0 && (
              <div className="role-special-info">
                <p className="info-label">可能是梅林的玩家：</p>
                {privateState.merlinCandidates.map(playerId => (
                  <div key={playerId} className="info-player">
                    {getPlayerName(playerId)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-confirm-role"
            onClick={() => setRoleConfirmed(true)}
          >
            我已确认角色，进入游戏
          </button>
        </div>
      </div>
    );
  }

  const isLeader = user?.id === publicState.leader;
  const isOnQuest = publicState.nominatedTeam?.includes(user?.id || '');
  const hasVotedTeam = publicState.teamVotes && user?.id ? publicState.teamVotes[user.id] !== undefined : false;
  const hasVotedQuest = privateState.hasVotedQuest || false;
  const canNominate = isLeader && publicState.phase === 'NOMINATION';
  const canVoteTeam = publicState.phase === 'TEAM_VOTE' && !hasVotedTeam;
  const canVoteQuest = publicState.phase === 'QUEST_VOTE' && isOnQuest && !hasVotedQuest;
  const canAssassinate = publicState.phase === 'ASSASSINATION' && privateState.role === 'assassin';

  // Debug logging
  console.log('[AvalonGame] Phase check:', {
    phase: publicState.phase,
    userId: user?.id,
    leader: publicState.leader,
    isLeader,
    canNominate,
    playersCount: players.length,
    players: players.map(p => ({ id: p.userId, name: p.username }))
  });

  console.log('[AvalonGame] Private state:', {
    role: privateState.role,
    team: privateState.team,
    roleDisplayName: getRoleDisplayName(privateState.role),
    evilPlayers: privateState.evilPlayers,
    merlinCandidates: privateState.merlinCandidates
  });

  return (
    <div className="avalon-game">
      {/* Header */}
      <div className="game-header">
        <div className="header-left">
          <h1>阿瓦隆</h1>
          <span className="phase-indicator">{getPhaseText(publicState.phase)}</span>
        </div>
        <div className="header-center">
          <span className="score-display">
            善良 {publicState.goodWins} : {publicState.evilWins} 邪恶
          </span>
        </div>
        <div className="header-right">
          <span className="current-user">
            <span className="user-icon">👤</span>
            {user?.username}
          </span>
          <button onClick={handleExitGame} className="btn-exit">
            退出游戏
          </button>
        </div>
      </div>

      {error && (
        <div className="game-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="game-content">
        {/* Role Card - Flippable */}
        <div className="role-card-container">
          <div
            className={`role-card-flip ${roleCardFlipped ? 'flipped' : ''}`}
            onClick={() => setRoleCardFlipped(!roleCardFlipped)}
          >
            <div className="role-card-front">
              <div className="card-back-design">
                <div className="card-icon">🃏</div>
                <p>点击查看角色</p>
              </div>
            </div>
            <div className={`role-card-back ${privateState.team}`}>
              <div className="role-name">{getRoleDisplayName(privateState.role)}</div>
              <div className="role-team">{privateState.team === 'good' ? '善良' : '邪恶'}</div>
              {privateState.evilPlayers && privateState.evilPlayers.length > 0 && (
                <div className="role-info-compact">
                  <small>邪恶玩家:</small>
                  {privateState.evilPlayers.map(id => (
                    <small key={id}>{getPlayerName(id)}</small>
                  ))}
                </div>
              )}
              {privateState.merlinCandidates && privateState.merlinCandidates.length > 0 && (
                <div className="role-info-compact">
                  <small>可能是梅林:</small>
                  {privateState.merlinCandidates.map(id => (
                    <small key={id}>{getPlayerName(id)}</small>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="game-main">
          {/* Quest Results */}
          <div className="quest-results">
            <h3>任务进度</h3>
            <div className="quests-row">
              {[1, 2, 3, 4, 5].map(questNum => {
                const result = publicState.questResults.find(q => q.questNumber === questNum);
                return (
                  <QuestCard
                    key={questNum}
                    questNumber={questNum}
                    result={result}
                    getPlayerName={getPlayerName}
                  />
                );
              })}
            </div>
          </div>

          {/* Current Leader */}
          <div className="leader-display">
            <span className="leader-label">当前队长：</span>
            <span className="leader-name">{getPlayerName(publicState.leader)}</span>
          </div>

          {/* Nomination Phase */}
          {canNominate && (
            <div className="action-panel">
              <h3>选择任务队员 ({selectedPlayers.length}/{getTeamSize()})</h3>
              {players.length === 0 ? (
                <div className="loading-message">
                  <p>正在加载玩家列表...</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    如果持续未显示，请刷新页面
                  </p>
                </div>
              ) : (
                <>
                  <div className="player-selection-grid">
                    {players.map(player => (
                      <button
                        key={player.userId}
                        className={`player-select-btn ${selectedPlayers.includes(player.userId) ? 'selected' : ''}`}
                        onClick={() => togglePlayerSelection(player.userId)}
                        disabled={!selectedPlayers.includes(player.userId) && selectedPlayers.length >= getTeamSize()}
                      >
                        {player.username}
                        {selectedPlayers.includes(player.userId) && ' ✓'}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-nominate"
                    onClick={nominateTeam}
                    disabled={selectedPlayers.length !== getTeamSize() || loading}
                  >
                    {loading ? '提交中...' : '提交队伍'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Team Vote Phase */}
          {canVoteTeam && publicState.nominatedTeam && (
            <div className="action-panel">
              <h3>对提名队伍投票</h3>
              <div className="nominated-team">
                <p>队长 {getPlayerName(publicState.leader)} 提名了：</p>
                <div className="team-members">
                  {publicState.nominatedTeam.map(userId => (
                    <span key={userId} className="team-member">{getPlayerName(userId)}</span>
                  ))}
                </div>
              </div>
              <div className="vote-buttons">
                <button className="btn-approve" onClick={() => voteTeam(true)} disabled={loading}>
                  赞成
                </button>
                <button className="btn-reject" onClick={() => voteTeam(false)} disabled={loading}>
                  反对
                </button>
              </div>
            </div>
          )}

          {/* Quest Vote Phase */}
          {canVoteQuest && (
            <div className="action-panel">
              <h3>任务投票</h3>
              <p>你在本次任务中，请投票：</p>
              <div className="vote-buttons">
                <button className="btn-success" onClick={() => voteQuest(true)} disabled={loading}>
                  成功
                </button>
                <button className="btn-fail" onClick={() => voteQuest(false)} disabled={loading}>
                  失败
                </button>
              </div>
              <p className="vote-note">注意：只有邪恶阵营可以投失败</p>
            </div>
          )}

          {/* Assassination Phase */}
          {canAssassinate && (
            <div className="action-panel">
              <h3>刺杀梅林</h3>
              <p>选择你认为是梅林的玩家：</p>
              <div className="player-selection-grid">
                {players.filter(p => p.userId !== user?.id).map(player => (
                  <button
                    key={player.userId}
                    className="player-select-btn"
                    onClick={() => assassinate(player.userId)}
                    disabled={loading}
                  >
                    {player.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Waiting State */}
          {!canNominate && !canVoteTeam && !canVoteQuest && !canAssassinate && publicState.phase !== 'GAME_OVER' && (
            <div className="waiting-panel">
              <p>等待其他玩家行动...</p>
              {publicState.phase === 'NOMINATION' && (
                <p>队长 {getPlayerName(publicState.leader)} 正在选择队员</p>
              )}
              {publicState.phase === 'TEAM_VOTE' && hasVotedTeam && (
                <p>等待其他玩家投票...</p>
              )}
              {publicState.phase === 'QUEST_VOTE' && hasVotedQuest && (
                <p>等待其他队员完成任务投票...</p>
              )}
              {publicState.phase === 'ASSASSINATION' && !canAssassinate && (
                <p>刺客正在选择刺杀目标...</p>
              )}
            </div>
          )}

          {/* Game Over */}
          {publicState.phase === 'GAME_OVER' && (
            <div className="game-over-panel">
              <h2>{publicState.winner === 'good' ? '善良阵营获胜！' : '邪恶阵营获胜！'}</h2>
              <div className="winner-reason">
                {publicState.winReason && <p>{publicState.winReason}</p>}
              </div>
              <button onClick={() => navigate('/lobby')} className="btn-back-lobby">
                返回大厅
              </button>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="players-panel">
          <h3>玩家 ({players.length})</h3>
          <div className="players-list">
            {players.map(player => (
              <div key={player.userId} className={`player-item ${player.userId === publicState.leader ? 'leader' : ''}`}>
                <span className="player-name">
                  {player.username}
                  {player.userId === publicState.leader && ' 👑'}
                  {publicState.nominatedTeam?.includes(player.userId) && ' ⚔️'}
                </span>
                <span className={`player-status ${player.connected ? 'online' : 'offline'}`}>
                  {player.connected ? '在线' : '离线'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
