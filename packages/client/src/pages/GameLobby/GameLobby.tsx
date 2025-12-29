/**
 * Game Lobby
 * Main lobby interface for selecting and joining games
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { initWebSocketClient } from '../../services/websocket-client';
import { API_CONFIG } from '../../config/api';
import './GameLobby.css';

interface Room {
  roomId: string;
  gameId: string;
  hostUserId: string;
  name: string;
  maxPlayers: number;
  players: Array<{
    userId: string;
    username: string;
    ready: boolean;
    connected: boolean;
  }>;
  status: 'lobby' | 'playing' | 'finished';
  createdAt: number;
}

export const GameLobby: React.FC = () => {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const { t } = useTranslation();
  const [selectedGame, setSelectedGame] = useState<'avalon' | 'text-adventure'>('avalon');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize WebSocket (OPTIONAL - uses polling as fallback)
  useEffect(() => {
    if (!token) {
      console.warn('[GameLobby] No token available, skipping WebSocket');
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
    console.log('[GameLobby] Attempting WebSocket connection:', wsUrl);

    try {
      const wsClient = initWebSocketClient(wsUrl, token);

      wsClient.connect()
        .then(() => {
          console.log('[Lobby] ✅ WebSocket connected (real-time updates enabled, polling disabled)');
          setWsConnected(true);

          // Listen for room updates
          wsClient.on('PLAYER_JOINED', handlePlayerJoined);
          wsClient.on('PLAYER_LEFT', handlePlayerLeft);
          wsClient.on('PLAYER_READY', handlePlayerReady);
          wsClient.on('ROOM_DELETED', handleRoomDeleted);
          wsClient.on('ROOM_CREATED', handleRoomCreated);
        })
        .catch(error => {
          console.warn('[Lobby] ⚠️ WebSocket connection failed, using polling fallback');
          console.debug('[Lobby] WS Error:', error);
          setWsConnected(false);
          // Don't throw - polling will handle updates
        });

      return () => {
        console.log('[GameLobby] Cleaning up event listeners (keeping WebSocket connected)');
        // Remove event listeners but keep WebSocket connected
        // WebSocket should persist across page navigation
        wsClient.off('PLAYER_JOINED', handlePlayerJoined);
        wsClient.off('PLAYER_LEFT', handlePlayerLeft);
        wsClient.off('PLAYER_READY', handlePlayerReady);
        wsClient.off('ROOM_DELETED', handleRoomDeleted);
        wsClient.off('ROOM_CREATED', handleRoomCreated);
      };
    } catch (error) {
      console.error('[GameLobby] WebSocket init error:', error);
      setWsConnected(false);
      // Continue without WebSocket - polling will work
    }
  }, [token]);

  // Check if user is already in a room on mount (only for lobby rooms, not playing games)
  useEffect(() => {
    if (!token) return;

    const checkExistingRoom = async () => {
      try {
        const response = await fetch(`${API_CONFIG.LOBBY_API}/my-room`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success && data.data) {
          const room = data.data;
          console.log('[GameLobby] User is already in room:', room.roomId);

          // Only auto-navigate if in lobby status (not playing)
          // This allows users to return to lobby even if they have an active game
          if (room.status === 'lobby') {
            console.log('[GameLobby] Rejoining lobby room:', room.roomId);
            navigate(`/lobby/${room.gameId}/${room.roomId}`);
          } else if (room.status === 'playing') {
            console.log('[GameLobby] User has active game, but staying in lobby (user can manually rejoin)');
            // Don't auto-navigate to active games - let user stay in lobby
          }
        }
      } catch (error) {
        console.error('[GameLobby] Error checking existing room:', error);
      }
    };

    checkExistingRoom();
  }, [token, navigate]);

  // Fetch rooms on mount and when game selection changes
  // 智能轮询：只在WebSocket未连接时启用
  useEffect(() => {
    fetchRooms();

    // 如果WebSocket已连接，使用低频率心跳检测（30秒）
    // 如果WebSocket未连接，使用正常轮询（5秒）
    const pollingInterval = wsConnected ? 30000 : 5000;

    if (wsConnected) {
      console.log('[Lobby] WebSocket active, using 30s heartbeat polling');
    } else {
      console.log('[Lobby] WebSocket inactive, using 5s polling fallback');
    }

    const interval = setInterval(fetchRooms, pollingInterval);
    return () => clearInterval(interval);
  }, [selectedGame, wsConnected]);

  const handlePlayerJoined = (payload: any) => {
    console.log('[Lobby] Player joined (WebSocket):', payload);
    fetchRooms();
  };

  const handlePlayerLeft = (payload: any) => {
    console.log('[Lobby] Player left (WebSocket):', payload);
    fetchRooms();
  };

  const handlePlayerReady = (payload: any) => {
    console.log('[Lobby] Player ready (WebSocket):', payload);
    fetchRooms();
  };

  const handleRoomDeleted = (payload: any) => {
    console.log('[Lobby] Room deleted (WebSocket):', payload);
    fetchRooms();
  };

  const handleRoomCreated = (payload: any) => {
    console.log('[Lobby] Room created (WebSocket):', payload);
    fetchRooms();
  };

  const fetchRooms = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_CONFIG.LOBBY_API}/rooms?gameId=${selectedGame}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (error) {
      console.error('[Lobby] Failed to fetch rooms:', error);
    }
  };

  const handleGameSelect = (game: 'avalon' | 'text-adventure') => {
    console.log('[GameLobby] Game selected:', game);
    setSelectedGame(game);
  };

  const handleShowCreateModal = () => {
    console.log('[GameLobby] Opening create room modal');
    setError(null); // Clear any existing errors
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    console.log('[GameLobby] Closing create room modal');
    setShowCreateModal(false);
    setRoomName(''); // Clear room name
    setError(null); // Clear errors
  };

  const createRoom = async () => {
    console.log('[GameLobby] Creating room:', { gameId: selectedGame, name: roomName, maxPlayers, hasToken: !!token });

    if (!token) {
      console.error('[GameLobby] Cannot create room: no token (user not logged in?)');
      setError('请先登录');
      return;
    }

    if (!roomName.trim()) {
      console.warn('[GameLobby] Cannot create room: room name is empty');
      setError('请输入房间名称');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameId: selectedGame,
          name: roomName,
          maxPlayers
        })
      });

      const data = await response.json();
      console.log('[GameLobby] Create room response:', data);

      if (data.success) {
        setShowCreateModal(false);
        setRoomName('');

        // Navigate to room waiting page
        if (selectedGame === 'avalon') {
          navigate(`/lobby/avalon/${data.data.roomId}`);
        } else {
          navigate(`/game/scene-select`); // Existing text adventure flow
        }
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('[Lobby] Create room error:', error);
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.LOBBY_API}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Navigate to room waiting page
        if (selectedGame === 'avalon') {
          navigate(`/lobby/avalon/${roomId}`);
        }
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('[Lobby] Join room error:', error);
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <h1>{t('lobby.title')}</h1>
        <div className="lobby-user-info">
          <span>{t('lobby.welcome', { username: user?.username })}</span>
          <button onClick={() => navigate('/game')} className="btn-back">{t('lobby.backToMenu')}</button>
          <button onClick={logout} className="btn-logout">{t('lobby.logout')}</button>
        </div>
      </div>

      {error && (
        <div className="lobby-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="lobby-content">
        {/* Game Selection */}
        <div className="game-selection">
          <h2>{t('lobby.selectGame')}</h2>
          <div className="game-cards">
            <div
              className={`game-card ${selectedGame === 'avalon' ? 'selected' : ''}`}
              onClick={() => handleGameSelect('avalon')}
              role="button"
              tabIndex={0}
            >
              <h3>{t('games.avalon.name')}</h3>
              <p>{t('games.avalon.description')}</p>
              <p>{t('games.avalon.tags')}</p>
            </div>
            <div
              className="game-card disabled"
              role="button"
              tabIndex={-1}
            >
              <h3>{t('games.textAdventure.name')}</h3>
              <p>{t('games.textAdventure.description')}</p>
              <p>{t('games.textAdventure.tags')}</p>
              <div className="maintenance-badge">🔧 {t('lobby.maintenance')}</div>
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="room-list-section">
          <div className="room-list-header">
            <h2>{t('lobby.roomList')}</h2>
            <button
              onClick={handleShowCreateModal}
              className="btn-create-room"
              disabled={loading}
            >
              {t('lobby.createRoom')}
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="no-rooms">
              <p>{t('lobby.noRooms')}</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map(room => (
                <div key={room.roomId} className="room-card">
                  <div className="room-header">
                    <h3>{room.name}</h3>
                    <span className="room-status">{t(`lobby.status.${room.status === 'lobby' ? 'waiting' : 'playing'}`)}</span>
                  </div>
                  <div className="room-info">
                    <p>{t('lobby.players')}: {room.players.length}/{room.maxPlayers}</p>
                    <p>{t('lobby.host')}: {room.players.find(p => p.userId === room.hostUserId)?.username}</p>
                  </div>
                  <div className="room-players">
                    {room.players.map(player => (
                      <span key={player.userId} className={`player-tag ${player.ready ? 'ready' : ''}`}>
                        {player.username} {player.ready && '✓'}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => joinRoom(room.roomId)}
                    disabled={loading || (room.status === 'lobby' && room.players.length >= room.maxPlayers)}
                    className="btn-join-room"
                  >
                    {room.status === 'playing' ? t('lobby.rejoin') :
                     room.players.length >= room.maxPlayers ? t('lobby.full') : t('lobby.join')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{t('lobby.createRoomModal.title')}</h2>

            {error && (
              <div className="modal-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label>{t('lobby.createRoomModal.roomName')} <span className="required">*</span></label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder={t('lobby.createRoomModal.roomNamePlaceholder')}
                maxLength={30}
                autoFocus
              />
              {!roomName.trim() && (
                <small className="input-hint">{t('lobby.createRoomModal.roomNameRequired')}</small>
              )}
            </div>
            {selectedGame === 'avalon' && (
              <div className="form-group">
                <label>{t('lobby.createRoomModal.maxPlayers')}</label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Math.min(10, Math.max(6, parseInt(e.target.value) || 6)))}
                  min={6}
                  max={10}
                />
              </div>
            )}
            <div className="modal-actions">
              <button onClick={handleCloseCreateModal} className="btn-cancel">
                {t('common.cancel')}
              </button>
              <button
                onClick={createRoom}
                className="btn-confirm"
                disabled={loading || !roomName.trim()}
                title={!roomName.trim() ? t('lobby.createRoomModal.roomNameRequired') : t('lobby.createRoom')}
              >
                {loading ? t('lobby.createRoomModal.creating') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
