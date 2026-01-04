/**
 * Avalon Game - Main Game Interface
 * Complete game flow with all phases
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { getWebSocketClient } from '../../services/websocket-client';
import { API_CONFIG } from '../../config/api';
import { QuestCard } from '../../components/QuestCard/QuestCard';
import { QuestResult } from '@survival-game/shared';
import { AvalonHelp } from '../../components/AvalonHelp/AvalonHelp';
import './AvalonGame.css';

interface Player {
  userId: string;
  username: string;
  ready?: boolean;
  connected?: boolean;
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
  bladeStrikeRequests: string[];
  bladeStrikeActive: boolean;
  bladeStrikeTarget?: string;
  winner?: string;
  winReason?: string;
}

interface PrivateState {
  userId: string;
  role: string;
  team: string;
  evilPlayers?: string[];
  knownEvil?: string[];
  merlinCandidates?: string[];
  hasVotedQuest?: boolean;
}

export const AvalonGame: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [privateState, setPrivateState] = useState<PrivateState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Game start states
  const [countdown, setCountdown] = useState(5);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [roleCardFlipped, setRoleCardFlipped] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);

  // Blade Strike states
  const [bladeStrikeShowConfirm, setBladeStrikeShowConfirm] = useState<'request' | 'direct' | 'accept' | null>(null);
  const [bladeStrikeRequestInfo, setBladeStrikeRequestInfo] = useState<{username: string} | null>(null);
  const [bladeStrikeShowStarted, setBladeStrikeShowStarted] = useState(false);
  const [bladeStrikeStartedBy, setBladeStrikeStartedBy] = useState<string | null>(null);
  const [bladeStrikeShowTarget, setBladeStrikeShowTarget] = useState(false);
  const [bladeStrikeTargetInfo, setBladeStrikeTargetInfo] = useState<{target: string; targetRole: string; hitMerlin: boolean} | null>(null);
  const [bladeStrikeShowResult, setBladeStrikeShowResult] = useState(false);

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

    // Handle blade strike events
    if (payload.type === 'BLADE_STRIKE_REQUESTED') {
      // Only show to assassin
      if (privateState?.role === 'assassin') {
        setBladeStrikeRequestInfo({ username: payload.payload.requesterUsername });
      }
    } else if (payload.type === 'BLADE_STRIKE_STARTED') {
      // Show to all players
      setBladeStrikeStartedBy(payload.payload.assassinUsername);
      setBladeStrikeShowStarted(true);
      setTimeout(() => {
        setBladeStrikeShowStarted(false);
      }, 3000);
    } else if (payload.type === 'BLADE_STRIKE_TARGET') {
      // Show target reveal
      setBladeStrikeTargetInfo({
        target: payload.payload.targetUsername,
        targetRole: payload.payload.targetRole,
        hitMerlin: payload.payload.hitMerlin
      });
      setBladeStrikeShowTarget(true);

      // Show target for 3 seconds, then show result
      setTimeout(() => {
        setBladeStrikeShowTarget(false);
        setBladeStrikeShowResult(true);

        // Show result for 5 seconds
        setTimeout(() => {
          setBladeStrikeShowResult(false);
        }, 5000);
      }, 3000);
    } else if (payload.type === 'BLADE_STRIKE_REJECTED') {
      // Clear request notification
      setBladeStrikeRequestInfo(null);
    }

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
        setRoomId(data.data.roomId);
        console.log('[AvalonGame] Fetched state - players:', playersData.length, playersData);
      } else if (response.status === 404 || data.gameEnded) {
        // Game not found or ended, redirect to lobby
        console.warn('[AvalonGame] Game not found or ended, redirecting to lobby');
        setError(t('avalonGame.gameEndedOrNotFound'));
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

  // Blade Strike actions
  const requestBladeStrike = () => {
    performAction('REQUEST_BLADE_STRIKE', {});
  };

  const respondToBladeStrikeRequest = (accept: boolean) => {
    performAction('BLADE_STRIKE_DECISION', { accept });
  };

  const initiateBladeStrike = () => {
    performAction('BLADE_STRIKE', {});
  };

  const selectBladeStrikeTarget = (targetUserId: string) => {
    performAction('BLADE_STRIKE_TARGET', { targetUserId });
  };

  const handleExitGame = async () => {
    if (!token) return;

    // Confirm before exiting
    if (!window.confirm(t('avalonGame.confirmExit'))) {
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

  const handlePlayAgain = async () => {
    if (!token || !roomId) return;

    setIsResetting(true);
    try {
      const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        console.log('[AvalonGame] Room reset successfully, navigating to room');
        // Navigate back to the room
        navigate(`/lobby/avalon/${roomId}`);
      } else {
        setError('重置房间失败');
      }
    } catch (error) {
      console.error('[AvalonGame] Error resetting room:', error);
      setError('重置房间失败');
    } finally {
      setIsResetting(false);
    }
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

  const getQuestTeamSize = (questNumber: number) => {
    const teamSizes: Record<number, number[]> = {
      6: [2, 3, 4, 3, 4],
      7: [2, 3, 3, 4, 4],
      8: [3, 4, 4, 5, 5],
      9: [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5]
    };

    const playerCount = players.length || 6;
    return teamSizes[playerCount]?.[questNumber - 1] || 2;
  };

  const getPlayerName = (userId: string): string => {
    const player = players.find(p => p.userId === userId);
    return player?.username || userId;
  };

  const getRoleDisplayName = (role: string): string => {
    // Convert snake_case to camelCase
    const roleKey = role.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const displayName = t(`avalonConfig.roles.${roleKey}`, { defaultValue: role });
    console.log('[AvalonGame] Role display:', role, '->', displayName);
    return displayName;
  };

  const getPhaseText = (phase: string): string => {
    const phaseKey = phase.toLowerCase();
    return t(`avalonGame.phase.${phaseKey}`, { defaultValue: phase });
  };

  if (!publicState || !privateState) {
    return (
      <div className="avalon-game loading">
        <div className="loading-spinner"></div>
        <p>{t('avalonGame.loading')}</p>
      </div>
    );
  }

  // Countdown screen
  if (publicState.phase === 'ROLE_REVEAL' && !roleConfirmed) {
    if (countdown > 0) {
      return (
        <div className="avalon-game countdown-screen">
          <h1>{t('avalonGame.gameStarting')}</h1>
          <div className="countdown-number">{countdown}</div>
          <p>{t('avalonGame.prepareRole')}</p>
        </div>
      );
    }

    if (!showRoleReveal) {
      return (
        <div className="avalon-game loading">
          <p>{t('avalonGame.preparing')}</p>
        </div>
      );
    }

    // Role reveal screen
    return (
      <div className="avalon-game role-reveal-screen">
        <div className="role-reveal-content">
          <h1>{t('avalonGame.yourRole')}</h1>
          <div className={`role-reveal-card ${privateState.team}`}>
            <div className="role-name-large">{getRoleDisplayName(privateState.role)}</div>
            <div className="role-team-large">
              {privateState.team === 'good' ? `${t('avalonGame.team.good')} ⚔️` : `${t('avalonGame.team.evil')} ⚔️`}
            </div>

            {/* Special Info */}
            {privateState.evilPlayers && privateState.evilPlayers.length > 0 && (
              <div className="role-special-info">
                <p className="info-label">{t('avalonGame.roleInfo.knownEvil')}</p>
                {privateState.evilPlayers.map(playerId => (
                  <div key={playerId} className="info-player">
                    {getPlayerName(playerId)}
                  </div>
                ))}
              </div>
            )}

            {privateState.knownEvil && privateState.knownEvil.length > 0 && (
              <div className="role-special-info">
                <p className="info-label">{t('avalonGame.roleInfo.knownEvil')}</p>
                {privateState.knownEvil.map(playerId => (
                  <div key={playerId} className="info-player">
                    {getPlayerName(playerId)}
                  </div>
                ))}
              </div>
            )}

            {privateState.merlinCandidates && privateState.merlinCandidates.length > 0 && (
              <div className="role-special-info">
                <p className="info-label">{t('avalonGame.roleInfo.merlinCandidates')}</p>
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
            {t('avalonGame.confirmRole')}
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
          <h1>{t('games.avalon.name')}</h1>
          <span className="phase-indicator">{getPhaseText(publicState.phase)}</span>
        </div>
        <div className="header-center">
          <span className="score-display">
            {t('avalonGame.score', { good: publicState.goodWins, evil: publicState.evilWins })}
          </span>
        </div>
        <div className="header-right">
          <span className="current-user">
            <span className="user-icon">👤</span>
            {t('avalonGame.currentUser', { username: user?.username })}
          </span>
          <button onClick={() => setShowHelp(true)} className="btn-help-game">
            {t('avalonGame.help')}
          </button>
          <button onClick={handleExitGame} className="btn-exit">
            {t('avalonGame.exitGame')}
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
                <p>{t('avalonGame.clickToViewRole')}</p>
              </div>
            </div>
            <div className={`role-card-back ${privateState.team}`}>
              <div className="role-name">{getRoleDisplayName(privateState.role)}</div>
              <div className="role-team">{t(`avalonGame.team.${privateState.team}`)}</div>
              {privateState.evilPlayers && privateState.evilPlayers.length > 0 && (
                <div className="role-info-compact">
                  <small>{t('avalonGame.roleInfo.knownEvil')}</small>
                  {privateState.evilPlayers.map(id => (
                    <small key={id}>{getPlayerName(id)}</small>
                  ))}
                </div>
              )}
              {privateState.knownEvil && privateState.knownEvil.length > 0 && (
                <div className="role-info-compact">
                  <small>{t('avalonGame.roleInfo.knownEvil')}</small>
                  {privateState.knownEvil.map(id => (
                    <small key={id}>{getPlayerName(id)}</small>
                  ))}
                </div>
              )}
              {privateState.merlinCandidates && privateState.merlinCandidates.length > 0 && (
                <div className="role-info-compact">
                  <small>{t('avalonGame.roleInfo.merlinCandidates')}</small>
                  {privateState.merlinCandidates.map(id => (
                    <small key={id}>{getPlayerName(id)}</small>
                  ))}
                </div>
              )}

              {/* Blade Strike Buttons - Only show if role card is flipped and game is active */}
              {roleCardFlipped && publicState.phase !== 'LOBBY' && publicState.phase !== 'ROLE_REVEAL' && publicState.phase !== 'GAME_OVER' && !publicState.bladeStrikeActive && (
                <>
                  {/* Assassin: Direct blade strike button */}
                  {privateState.role === 'assassin' && (
                    <button
                      className="blade-strike-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBladeStrikeShowConfirm('direct');
                      }}
                    >
                      {t('avalonGame.bladeStrike')}
                    </button>
                  )}

                  {/* Non-assassin evil: Request blade strike button */}
                  {privateState.team === 'evil' && privateState.role !== 'assassin' && !(publicState.bladeStrikeRequests?.includes(user?.id || '') ?? false) && (
                    <button
                      className="blade-strike-button request"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBladeStrikeShowConfirm('request');
                      }}
                    >
                      {t('avalonGame.requestBladeStrike')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="game-main">
          {/* Quest Results */}
          <div className="quest-results">
            <h3>{t('avalonGame.questProgress')}</h3>
            <div className="quests-row">
              {[1, 2, 3, 4, 5].map(questNum => {
                const result = publicState.questResults.find(q => q.questNumber === questNum);
                return (
                  <QuestCard
                    key={questNum}
                    questNumber={questNum}
                    teamSize={getQuestTeamSize(questNum)}
                    result={result}
                    getPlayerName={getPlayerName}
                  />
                );
              })}
            </div>
          </div>

          {/* Current Leader */}
          <div className="leader-display">
            <span className="leader-label">{t('avalonGame.currentLeader')}</span>
            <span className="leader-name">{getPlayerName(publicState.leader)}</span>
          </div>

          {/* Nomination Phase */}
          {canNominate && (
            <div className="action-panel">
              <h3>{t('avalonGame.selectTeamMembers', { selected: selectedPlayers.length, total: getTeamSize() })}</h3>
              {players.length === 0 ? (
                <div className="loading-message">
                  <p>{t('avalonGame.loadingPlayers')}</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {t('avalonGame.refreshIfNeeded')}
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
                    {loading ? t('avalonGame.submitting') : t('avalonGame.submitTeam')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Team Vote Phase */}
          {canVoteTeam && publicState.nominatedTeam && (
            <div className="action-panel">
              <h3>{t('avalonGame.voteOnTeam')}</h3>
              <div className="nominated-team">
                <p>{t('avalonGame.leaderNominated', { leader: getPlayerName(publicState.leader) })}</p>
                <div className="team-members">
                  {publicState.nominatedTeam.map(userId => (
                    <span key={userId} className="team-member">{getPlayerName(userId)}</span>
                  ))}
                </div>
              </div>
              <div className="vote-buttons">
                <button className="btn-approve" onClick={() => voteTeam(true)} disabled={loading}>
                  {t('avalonGame.approve')}
                </button>
                <button className="btn-reject" onClick={() => voteTeam(false)} disabled={loading}>
                  {t('avalonGame.reject')}
                </button>
              </div>
            </div>
          )}

          {/* Quest Vote Phase */}
          {canVoteQuest && (
            <div className="action-panel">
              <h3>{t('avalonGame.questVote')}</h3>
              <p>{t('avalonGame.youAreOnQuest')}</p>
              <div className="vote-buttons">
                <button className="btn-success" onClick={() => voteQuest(true)} disabled={loading}>
                  {t('avalonGame.success')}
                </button>
                <button className="btn-fail" onClick={() => voteQuest(false)} disabled={loading}>
                  {t('avalonGame.fail')}
                </button>
              </div>
              <p className="vote-note">{t('avalonGame.evilCanFail')}</p>
            </div>
          )}

          {/* Assassination Phase */}
          {canAssassinate && (
            <div className="action-panel">
              <h3>{t('avalonGame.assassinateMerlin')}</h3>
              <p>{t('avalonGame.selectMerlin')}</p>
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

          {/* Blade Strike Target Selection */}
          {publicState.bladeStrikeActive && privateState.role === 'assassin' && !publicState.bladeStrikeTarget && (
            <div className="action-panel blade-strike-selection">
              <h3>{t('avalonGame.bladeStrikeSelectTarget')}</h3>
              <div className="player-selection-grid">
                {players.filter(p => p.userId !== user?.id).map(player => (
                  <button
                    key={player.userId}
                    className="player-select-btn blade-strike-target"
                    onClick={() => selectBladeStrikeTarget(player.userId)}
                    disabled={loading}
                  >
                    {player.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Waiting State */}
          {!canNominate && !canVoteTeam && !canVoteQuest && !canAssassinate && publicState.phase !== 'GAME_OVER' && !publicState.bladeStrikeActive && (
            <div className="waiting-panel">
              <p>{t('avalonGame.waitingForOthers')}</p>
              {publicState.phase === 'NOMINATION' && (
                <p>{t('avalonGame.leaderSelecting', { leader: getPlayerName(publicState.leader) })}</p>
              )}
              {publicState.phase === 'TEAM_VOTE' && hasVotedTeam && (
                <p>{t('avalonGame.waitingForVotes')}</p>
              )}
              {publicState.phase === 'QUEST_VOTE' && hasVotedQuest && (
                <p>{t('avalonGame.waitingForQuestVotes')}</p>
              )}
              {publicState.phase === 'ASSASSINATION' && !canAssassinate && (
                <p>{t('avalonGame.assassinSelecting')}</p>
              )}
            </div>
          )}

          {/* Blade Strike Waiting State */}
          {publicState.bladeStrikeActive && (privateState.role !== 'assassin' || publicState.bladeStrikeTarget) && (
            <div className="waiting-panel blade-strike-waiting">
              <p>{t('avalonGame.waitingForBladeStrikeTarget')}</p>
            </div>
          )}

          {/* Game Over */}
          {publicState.phase === 'GAME_OVER' && (
            <div className="game-over-panel">
              <h2>{publicState.winner === 'good' ? t('avalonGame.goodWins') : t('avalonGame.evilWins')}</h2>
              <div className="winner-reason">
                {publicState.winReason && <p>{publicState.winReason}</p>}
              </div>
              <div className="game-over-buttons">
                <button
                  onClick={handlePlayAgain}
                  className="btn-play-again"
                  disabled={isResetting || !roomId}
                >
                  {isResetting ? t('avalonGame.resetting') : t('avalonGame.playAgain')}
                </button>
                <button onClick={() => navigate('/lobby')} className="btn-back-lobby">
                  {t('avalonGame.backToLobby')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="players-panel">
          <h3>{t('avalonGame.players', { count: players.length })}</h3>
          <div className="players-list">
            {players.map(player => (
              <div key={player.userId} className={`player-item ${player.userId === publicState.leader ? 'leader' : ''}`}>
                <span className="player-name">
                  {player.username}
                  {player.userId === publicState.leader && ' 👑'}
                  {publicState.nominatedTeam?.includes(player.userId) && ' ⚔️'}
                </span>
                <span className={`player-status ${player.connected ? 'online' : 'offline'}`}>
                  {player.connected ? t('avalonGame.online') : t('avalonGame.offline')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blade Strike Request Notification (for Assassin) */}
      {bladeStrikeRequestInfo && privateState?.role === 'assassin' && (
        <div className="blade-strike-request-notification">
          <div className="notification-content">
            <h3>{t('avalonGame.bladeStrikeRequested', { username: bladeStrikeRequestInfo.username })}</h3>
            <div className="notification-buttons">
              <button
                className="btn-accept"
                onClick={() => setBladeStrikeShowConfirm('accept')}
              >
                {t('avalonGame.acceptBladeStrike')}
              </button>
              <button
                className="btn-reject"
                onClick={() => {
                  respondToBladeStrikeRequest(false);
                  setBladeStrikeRequestInfo(null);
                }}
              >
                {t('avalonGame.rejectBladeStrike')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blade Strike Confirmation Modals */}
      {bladeStrikeShowConfirm && (
        <div className="blade-strike-confirm-modal" onClick={() => setBladeStrikeShowConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {bladeStrikeShowConfirm === 'request' && (
              <>
                <h3>{t('avalonGame.confirmRequestBladeStrike')}</h3>
                <p>{t('avalonGame.confirmRequestBladeStrikeMessage')}</p>
                <div className="modal-buttons">
                  <button
                    className="btn-confirm"
                    onClick={() => {
                      requestBladeStrike();
                      setBladeStrikeShowConfirm(null);
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => setBladeStrikeShowConfirm(null)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}

            {bladeStrikeShowConfirm === 'direct' && (
              <>
                <h3>{t('avalonGame.confirmBladeStrike')}</h3>
                <p>{t('avalonGame.confirmBladeStrikeMessage')}</p>
                <div className="modal-buttons">
                  <button
                    className="btn-confirm"
                    onClick={() => {
                      initiateBladeStrike();
                      setBladeStrikeShowConfirm(null);
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => setBladeStrikeShowConfirm(null)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}

            {bladeStrikeShowConfirm === 'accept' && (
              <>
                <h3>{t('avalonGame.confirmAcceptBladeStrike')}</h3>
                <p>{t('avalonGame.confirmAcceptBladeStrikeMessage')}</p>
                <div className="modal-buttons">
                  <button
                    className="btn-confirm"
                    onClick={() => {
                      respondToBladeStrikeRequest(true);
                      setBladeStrikeRequestInfo(null);
                      setBladeStrikeShowConfirm(null);
                    }}
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => setBladeStrikeShowConfirm(null)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Blade Strike Started Full-Screen Effect */}
      {bladeStrikeShowStarted && (
        <div className="blade-strike-fullscreen">
          <div className="fullscreen-content">
            <h1>{t('avalonGame.bladeStrikeStarted')}</h1>
            <p>{t('avalonGame.bladeStrikeStartedDesc', { assassin: bladeStrikeStartedBy })}</p>
          </div>
        </div>
      )}

      {/* Blade Strike Target Reveal Effect */}
      {bladeStrikeShowTarget && bladeStrikeTargetInfo && (
        <div className="blade-strike-target-effect">
          <div className="target-content">
            <h2>{t('avalonGame.bladeStrikeTarget', { target: bladeStrikeTargetInfo.target })}</h2>
            <div className="target-role">{getRoleDisplayName(bladeStrikeTargetInfo.targetRole)}</div>
          </div>
        </div>
      )}

      {/* Blade Strike Result Effect */}
      {bladeStrikeShowResult && bladeStrikeTargetInfo && (
        <div className={`blade-strike-result ${bladeStrikeTargetInfo.hitMerlin ? 'success' : 'failed'}`}>
          <div className="result-content">
            <h1>{bladeStrikeTargetInfo.hitMerlin ? t('avalonGame.bladeStrikeSuccess') : t('avalonGame.bladeStrikeFailed')}</h1>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <AvalonHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
