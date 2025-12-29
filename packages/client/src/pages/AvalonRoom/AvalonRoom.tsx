/**
 * Avalon Room - Waiting Room
 * Players wait here before game starts
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { getWebSocketClient } from '../../services/websocket-client';
import { API_CONFIG } from '../../config/api';
import { AvalonRoomConfig } from '../../components/AvalonRoomConfig/AvalonRoomConfig';
import { AvalonHelp } from '../../components/AvalonHelp/AvalonHelp';
import './AvalonRoom.css';

interface Player {
  userId: string;
  username: string;
  ready: boolean;
  connected: boolean;
}

interface GameMatch {
  matchId: string;
  roomId: string;
  gameId: string;
  state: any;
  players: Player[];
  createdAt: number;
}

interface RoleConfiguration {
  merlin: number;
  percival: number;
  loyalServant: number;
  assassin: number;
  morgana: number;
  mordred: number;
  oberon: number;
  minion: number;
}

interface AvalonRoomConfigData {
  targetPlayerCount: number;
  roleConfig: RoleConfiguration;
}

interface Room {
  roomId: string;
  gameId: string;
  hostUserId: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  match?: GameMatch;
  status: 'lobby' | 'playing' | 'finished';
  createdAt: number;
  avalonConfig?: AvalonRoomConfigData;
}

export const AvalonRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [room, setRoom] = useState<Room | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Ensure user is in the room (handle page refresh)
  useEffect(() => {
    if (!token || !roomId || !user) return;

    const ensureInRoom = async () => {
      try {
        // Try to join/rejoin the room
        const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (!data.success) {
          console.error('[AvalonRoom] Failed to join room:', data.error);
          setError(data.error || 'Failed to join room');
          // Navigate back to lobby after a delay
          setTimeout(() => navigate('/lobby'), 2000);
        } else {
          console.log('[AvalonRoom] Successfully joined/rejoined room');
        }
      } catch (error) {
        console.error('[AvalonRoom] Error joining room:', error);
        setError('Failed to connect to room');
      }
    };

    ensureInRoom();
  }, [token, roomId, user, navigate]);

  // Join WebSocket room
  useEffect(() => {
    if (!roomId) return;

    const wsClient = getWebSocketClient();
    if (wsClient && wsClient.isConnected()) {
      console.log('[AvalonRoom] WebSocket connected, enabling real-time updates');
      setWsConnected(true);
      wsClient.joinRoom(roomId);

      // Listen for room events
      wsClient.on('PLAYER_JOINED', handleRoomUpdate);
      wsClient.on('PLAYER_LEFT', handleRoomUpdate);
      wsClient.on('PLAYER_READY', handleRoomUpdate);
      wsClient.on('GAME_EVENT', handleGameEvent);
      wsClient.on('ROOM_CONFIG_UPDATED', handleConfigUpdate);

      return () => {
        wsClient.off('PLAYER_JOINED', handleRoomUpdate);
        wsClient.off('PLAYER_LEFT', handleRoomUpdate);
        wsClient.off('PLAYER_READY', handleRoomUpdate);
        wsClient.off('GAME_EVENT', handleGameEvent);
        wsClient.off('ROOM_CONFIG_UPDATED', handleConfigUpdate);
        wsClient.leaveRoom();
      };
    } else {
      console.log('[AvalonRoom] WebSocket not connected, using polling fallback');
      setWsConnected(false);
    }
  }, [roomId]);

  // Fetch room data with smart polling
  // 智能轮询：WebSocket连接时降低频率，断开时提高频率
  useEffect(() => {
    if (!token || !roomId) return;

    fetchRoom();

    // WebSocket连接 → 5秒轻量级轮询（保证数据一致性）
    // WebSocket断开 → 2秒轮询fallback（保证实时性）
    const pollingInterval = wsConnected ? 5000 : 2000;

    if (wsConnected) {
      console.log('[AvalonRoom] WebSocket active, using 5s polling for data consistency');
    } else {
      console.log('[AvalonRoom] WebSocket inactive, using 2s polling fallback');
    }

    const interval = setInterval(fetchRoom, pollingInterval);
    return () => clearInterval(interval);
  }, [token, roomId, wsConnected]);

  const handleRoomUpdate = (payload: any) => {
    console.log('[AvalonRoom] Room update (WebSocket):', payload);
    fetchRoom();
  };

  const handleConfigUpdate = (payload: any) => {
    console.log('[AvalonRoom] Config updated (WebSocket):', payload);
    fetchRoom();
  };

  const handleGameEvent = (payload: any) => {
    console.log('[AvalonRoom] Game event:', payload);

    // Check event type
    const eventType = payload.type || payload.payload?.type;

    if (eventType === 'GAME_STARTED') {
      // Game started, navigate to game interface
      console.log('[AvalonRoom] Game started event received, payload:', payload);
      const matchId = payload.matchId || payload.payload?.matchId;

      if (matchId) {
        console.log('[AvalonRoom] Navigating to game:', matchId);
        navigate(`/avalon/game/${matchId}`);
      } else {
        // Fallback: refetch room and check for match
        console.log('[AvalonRoom] No matchId in payload, fetching room...');
        fetchRoom();
      }
    }
  };

  const fetchRoom = async () => {
    if (!token || !roomId) return;

    try {
      const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setRoom(data.data);

        // Update my ready status
        const me = data.data.players.find((p: Player) => p.userId === user?.id);
        if (me) {
          setIsReady(me.ready);
        }

        // If game has started, navigate to game interface
        if (data.data.status === 'playing' && data.data.match?.matchId) {
          console.log('[AvalonRoom] Game is playing, navigating to game:', data.data.match.matchId);
          navigate(`/avalon/game/${data.data.match.matchId}`);
        }
      } else {
        setError(data.error || 'Failed to fetch room');
      }
    } catch (error) {
      console.error('[AvalonRoom] Fetch error:', error);
      setError('Failed to fetch room data');
    }
  };

  const toggleReady = async () => {
    if (!token || !roomId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ready: !isReady })
      });

      const data = await response.json();
      if (data.success) {
        setIsReady(!isReady);
      } else {
        setError(data.error || 'Failed to toggle ready');
      }
    } catch (error) {
      console.error('[AvalonRoom] Toggle ready error:', error);
      setError('Failed to update ready status');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!token || !roomId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.AVALON_API}/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Will be redirected by WebSocket event
        console.log('[AvalonRoom] Game starting:', data.data.matchId);
      } else {
        setError(data.error || 'Failed to start game');
      }
    } catch (error) {
      console.error('[AvalonRoom] Start game error:', error);
      setError('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (config: AvalonRoomConfigData) => {
    if (!token || !roomId) return;

    try {
      const response = await fetch(`${API_CONFIG.AVALON_API}/${roomId}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        console.log('[AvalonRoom] Config updated successfully');
        await fetchRoom();
      } else {
        throw new Error(data.error || 'Failed to update config');
      }
    } catch (error) {
      console.error('[AvalonRoom] Update config error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update configuration');
      throw error;
    }
  };

  const leaveRoom = async () => {
    if (!token || !roomId) return;

    try {
      await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      navigate('/lobby');
    } catch (error) {
      console.error('[AvalonRoom] Leave error:', error);
      navigate('/lobby');
    }
  };

  if (!room) {
    return (
      <div className="avalon-room loading">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const isHost = user?.id === room.hostUserId;
  // Host is always considered ready - only check if other players are ready
  const allReady = room.players.every(p => p.userId === room.hostUserId || p.ready);

  // 使用配置中的目标人数或房间的maxPlayers
  const targetPlayerCount = room.avalonConfig?.targetPlayerCount || room.maxPlayers;
  const canStart = isHost && allReady && room.players.length >= 6 && room.players.length <= 10 &&
                   room.players.length === targetPlayerCount;

  // 如果没有配置，创建默认配置
  const defaultConfig: AvalonRoomConfigData = {
    targetPlayerCount: room.maxPlayers,
    roleConfig: {
      merlin: 1,
      percival: 1,
      loyalServant: Math.max(0, room.maxPlayers >= 6 ? (room.maxPlayers >= 8 ? 3 : 2) : 0),
      assassin: 1,
      morgana: 1,
      mordred: room.maxPlayers >= 9 ? 1 : 0,
      oberon: 0,
      minion: Math.max(0, room.maxPlayers >= 7 ? 1 : 0)
    }
  };

  return (
    <div className="avalon-room">
      <div className="room-header">
        <div>
          <h1>{room.name}</h1>
          <p className="room-subtitle">{t('avalonRoom.title')}</p>
        </div>
        <div className="room-header-actions">
          <button onClick={() => setShowHelp(true)} className="btn-help">
            {t('avalonRoom.help')}
          </button>
          <button onClick={leaveRoom} className="btn-leave">
            {t('avalonRoom.leaveRoom')}
          </button>
        </div>
      </div>

      {error && (
        <div className="room-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="room-content">
        {/* 配置面板 */}
        <AvalonRoomConfig
          config={room.avalonConfig || defaultConfig}
          currentPlayerCount={room.players.length}
          isHost={isHost}
          onConfigUpdate={updateConfig}
        />

        <div className="room-panels">
          {/* Room Info */}
          <div className="room-info-panel">
          <h2>{t('avalonRoom.roomInfo')}</h2>
          <div className="info-item">
            <span>{t('lobby.host')}:</span>
            <strong>{room.players.find(p => p.userId === room.hostUserId)?.username}</strong>
          </div>
          <div className="info-item">
            <span>{t('lobby.players')}:</span>
            <strong>{room.players.length}/{targetPlayerCount}</strong>
          </div>
          <div className="info-item">
            <span>{t('avalonRoom.gameStatus')}:</span>
            <strong className={room.status === 'lobby' ? 'status-waiting' : 'status-playing'}>
              {t(`lobby.status.${room.status === 'lobby' ? 'waiting' : 'playing'}`)}
            </strong>
          </div>
          {room.players.length < 6 && (
            <div className="warning-box">
              ⚠️ {t('avalonRoom.minPlayersWarning')}
            </div>
          )}
          {room.players.length >= 6 && !allReady && (
            <div className="info-box">
              {t('avalonRoom.waitingForPlayers')}
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="players-panel">
          <h2>{t('avalonRoom.playerList')}</h2>
          <div className="players-list">
            {room.players.map(player => {
              const isPlayerHost = player.userId === room.hostUserId;
              const isPlayerReady = isPlayerHost || player.ready; // Host is always ready

              return (
                <div key={player.userId} className={`player-item ${isPlayerReady ? 'ready' : ''}`}>
                  <div className="player-avatar">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-info">
                    <span className="player-name">
                      {player.username}
                      {isPlayerHost && <span className="host-badge">{t('avalonRoom.hostBadge')}</span>}
                    </span>
                    <span className={`player-status ${isPlayerReady ? 'ready' : 'not-ready'}`}>
                      {isPlayerHost ? `✓ ${t('avalonRoom.readyHost')}` : (player.ready ? `✓ ${t('avalonRoom.ready')}` : t('avalonRoom.notReady'))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* Actions */}
      <div className="room-actions">
        {!isHost && (
          <button
            onClick={toggleReady}
            className={`btn-ready ${isReady ? 'ready' : ''}`}
            disabled={loading}
          >
            {isReady ? t('avalonRoom.cancelReady') : t('avalonRoom.ready')}
          </button>
        )}
        {isHost && (
          <button
            onClick={startGame}
            className="btn-start"
            disabled={!canStart || loading}
            title={
              !allReady ? t('avalonRoom.startGameTooltip.waitingReady') :
              room.players.length < 6 ? t('avalonRoom.startGameTooltip.minPlayers') :
              room.players.length > 10 ? t('avalonRoom.startGameTooltip.maxPlayers') :
              room.players.length !== targetPlayerCount ? t('avalonRoom.startGameTooltip.needExact', { count: targetPlayerCount }) :
              t('avalonRoom.startGameTooltip.ready')
            }
          >
            {loading ? t('avalonRoom.starting') : t('avalonRoom.startGame')}
          </button>
        )}
      </div>

      {/* Help Modal */}
      <AvalonHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
