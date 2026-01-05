/**
 * Root App Component
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { GameProvider } from './store/GameContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { MainMenu } from './pages/MainMenu/MainMenu';
import { SceneSelect } from './pages/SceneSelect/SceneSelect';
import { GamePlay } from './pages/GamePlay/GamePlay';
import { History } from './pages/History/History';
import { Achievements } from './pages/Achievements/Achievements';
import { SceneDemoPage } from './pages/SceneDemo/SceneDemoPage';
import { GameLobby } from './pages/GameLobby/GameLobby';
import { AvalonRoom } from './pages/AvalonRoom/AvalonRoom';
import { AvalonGame } from './pages/AvalonGame/AvalonGame';
import { AvalonGameDetail } from './pages/History/AvalonGameDetail';
import { AIAgentPage } from './pages/AIAgent/AIAgentPage';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import './i18n/config'; // Initialize i18n
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected game routes */}
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <MainMenu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/scene-select"
              element={
                <ProtectedRoute>
                  <SceneSelect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/play"
              element={
                <ProtectedRoute>
                  <GamePlay />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/avalon/history/:gameId"
              element={
                <ProtectedRoute>
                  <AvalonGameDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/achievements"
              element={
                <ProtectedRoute>
                  <Achievements />
                </ProtectedRoute>
              }
            />

            {/* Game Lobby */}
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <GameLobby />
                </ProtectedRoute>
              }
            />

            {/* Avalon Room */}
            <Route
              path="/lobby/avalon/:roomId"
              element={
                <ProtectedRoute>
                  <AvalonRoom />
                </ProtectedRoute>
              }
            />

            {/* Avalon Game */}
            <Route
              path="/avalon/game/:matchId"
              element={
                <ProtectedRoute>
                  <AvalonGame />
                </ProtectedRoute>
              }
            />

            {/* Scene demo (for testing phase 4 systems) */}
            <Route path="/demo" element={<SceneDemoPage />} />

            {/* AI Agent page (SSE streaming demo) */}
            <Route path="/ai_agent" element={<AIAgentPage />} />
          </Routes>
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
