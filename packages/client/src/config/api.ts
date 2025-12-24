/**
 * API Configuration
 * Centralized API base URLs for the application
 */

// Use relative URLs in production (nginx proxy handles routing)
// Use localhost in development
const isDev = import.meta.env.DEV;

export const API_CONFIG = {
  // Base URL for game API
  GAME_API: isDev ? 'http://localhost:3001/api/game' : '/api/game',

  // Base URL for auth API
  AUTH_API: isDev ? 'http://localhost:3001/api/auth' : '/api/auth',

  // Base URL for lobby API
  LOBBY_API: isDev ? 'http://localhost:3001/api/lobby' : '/api/lobby',

  // Base URL for Avalon API
  AVALON_API: isDev ? 'http://localhost:3001/api/avalon' : '/api/avalon',

  // WebSocket URL
  WS_URL: isDev ? 'ws://localhost:3001/ws' : `ws://${window.location.host}/ws`,
};

// Helper function to build full URL
export function getApiUrl(path: string): string {
  // If path already starts with http/https, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Otherwise, use relative path (works with nginx proxy)
  return path.startsWith('/') ? path : `/${path}`;
}
