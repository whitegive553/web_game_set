/**
 * Main server entry point
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import gameRoutes from './routes/game-routes';
import authRoutes from './routes/auth-routes';
import saveRoutes from './routes/save-routes';
import gameLobbyRoutes from './routes/game-lobby-routes';
import avalonRoutes from './routes/avalon-routes';
import avalonHistoryRoutes from './routes/avalon-history-routes';
import { initWebSocketService } from './services/websocket-service';

// Load environment variables from packages/server/.env
// In dev mode, cwd is packages/server, so .env is in the same directory
const envPath = path.join(process.cwd(), '.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

// Reset LLM client to ensure it reads the correct env vars
import { resetLLMClient } from './services/llm-client';
resetLLMClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow requests from nginx proxy and direct access
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost',  // nginx proxy in production
];

// In production, also allow the server's public IP if set
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(process.env.ALLOWED_ORIGIN);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In production, allow any origin (since we use nginx proxy)
      // The nginx proxy strips the origin, so we trust it
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static scene files (backgrounds, etc.)
// Go up two levels from packages/server to project root
const scenesPath = path.join(process.cwd(), '..', '..', 'scenes');
app.use('/scenes', express.static(scenesPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/save', saveRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/lobby', gameLobbyRoutes);
app.use('/api/avalon', avalonRoutes);
app.use('/api/avalon', avalonHistoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket service
initWebSocketService(server);

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Survival Narrative Game - Server');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Auth API: http://localhost:${PORT}/api/auth`);
  console.log(`Save API: http://localhost:${PORT}/api/save`);
  console.log(`Game API: http://localhost:${PORT}/api/game`);
  console.log(`Lobby API: http://localhost:${PORT}/api/lobby`);
  console.log(`Avalon API: http://localhost:${PORT}/api/avalon`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log('='.repeat(50));
  console.log('Environment Variables:');
  console.log(`LLM_PROVIDER: ${process.env.LLM_PROVIDER || 'NOT SET (will use mock)'}`);
  console.log(`LLM_MODEL: ${process.env.LLM_MODEL || 'NOT SET'}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log('='.repeat(50));
});
