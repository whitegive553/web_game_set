/**
 * Avalon Room - Waiting Room
 * Players wait here before game starts
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getWebSocketClient } from '../../services/websocket-client';
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
}

export const AvalonRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch room data
  useEffect(() => {
    if (!token || !roomId) return;

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [token, roomId]);

  // Join WebSocket room
  useEffect(() => {
    if (!roomId) return;

    const wsClient = getWebSocketClient();
    if (wsClient && wsClient.isConnected()) {
      wsClient.joinRoom(roomId);

      // Listen for room events
      wsClient.on('PLAYER_JOINED', handleRoomUpdate);
      wsClient.on('PLAYER_LEFT', handleRoomUpdate);
      wsClient.on('PLAYER_READY', handleRoomUpdate);
      wsClient.on('GAME_EVENT', handleGameEvent);

      return () => {
        wsClient.off('PLAYER_JOINED', handleRoomUpdate);
        wsClient.off('PLAYER_LEFT', handleRoomUpdate);
        wsClient.off('PLAYER_READY', handleRoomUpdate);
        wsClient.off('GAME_EVENT', handleGameEvent);
        wsClient.leaveRoom();
      };
    }
  }, [roomId]);

  const handleRoomUpdate = (payload: any) => {
    console.log('[AvalonRoom] Room update:', payload);
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
      const response = await fetch(`http://localhost:3001/api/lobby/rooms/${roomId}`, {
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
      const response = await fetch(`http://localhost:3001/api/lobby/rooms/${roomId}/ready`, {
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
      const response = await fetch(`http://localhost:3001/api/avalon/${roomId}/start`, {
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

  const leaveRoom = async () => {
    if (!token || !roomId) return;

    try {
      await fetch(`http://localhost:3001/api/lobby/rooms/${roomId}/leave`, {
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
        <p>加载中...</p>
      </div>
    );
  }

  const isHost = user?.id === room.hostUserId;
  // Host is always considered ready - only check if other players are ready
  const allReady = room.players.every(p => p.userId === room.hostUserId || p.ready);
  const canStart = isHost && allReady && room.players.length >= 6 && room.players.length <= 10;

  return (
    <div className="avalon-room">
      <div className="room-header">
        <div>
          <h1>{room.name}</h1>
          <p className="room-subtitle">阿瓦隆游戏房间</p>
        </div>
        <button onClick={leaveRoom} className="btn-leave">
          离开房间
        </button>
      </div>

      {error && (
        <div className="room-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="room-content">
        {/* Room Info */}
        <div className="room-info-panel">
          <h2>房间信息</h2>
          <div className="info-item">
            <span>房主:</span>
            <strong>{room.players.find(p => p.userId === room.hostUserId)?.username}</strong>
          </div>
          <div className="info-item">
            <span>玩家数量:</span>
            <strong>{room.players.length}/{room.maxPlayers}</strong>
          </div>
          <div className="info-item">
            <span>游戏状态:</span>
            <strong className={room.status === 'lobby' ? 'status-waiting' : 'status-playing'}>
              {room.status === 'lobby' ? '等待中' : '游戏中'}
            </strong>
          </div>
          {room.players.length < 6 && (
            <div className="warning-box">
              ⚠️ 阿瓦隆需要至少6名玩家
            </div>
          )}
          {room.players.length >= 6 && !allReady && (
            <div className="info-box">
              等待所有玩家准备...
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="players-panel">
          <h2>玩家列表</h2>
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
                      {isPlayerHost && <span className="host-badge">房主</span>}
                    </span>
                    <span className={`player-status ${isPlayerReady ? 'ready' : 'not-ready'}`}>
                      {isPlayerHost ? '✓ 已准备（房主）' : (player.ready ? '✓ 已准备' : '未准备')}
                    </span>
                  </div>
                </div>
              );
            })}
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
            {isReady ? '取消准备' : '准备'}
          </button>
        )}
        {isHost && (
          <button
            onClick={startGame}
            className="btn-start"
            disabled={!canStart || loading}
            title={
              !allReady ? '等待所有玩家准备' :
              room.players.length < 6 ? '至少需要6名玩家' :
              room.players.length > 10 ? '最多10名玩家' :
              '开始游戏'
            }
          >
            {loading ? '启动中...' : '开始游戏'}
          </button>
        )}
      </div>
    </div>
  );
};
