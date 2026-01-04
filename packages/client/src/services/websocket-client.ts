/**
 * WebSocket Client
 * Real-time communication with server
 */

type WebSocketMessageHandler = (message: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: Map<string, Set<WebSocketMessageHandler>> = new Map();
  private isIntentionallyClosed = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private pingIntervalTime = 30000; // 30 seconds

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false;
        const wsUrl = `${this.url}?token=${this.token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WS] Connected to server');
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WS] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.stopPing();
          this.ws = null;

          // Don't reconnect for authentication errors (code 1008)
          if (event.code === 1008) {
            console.error('[WS] Authentication failed - will not retry. Please check your login status.');
            this.emit('auth_failed', { code: event.code, reason: event.reason });
            return;
          }

          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing(); // Clear any existing interval
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        // Reduced logging to avoid spam
        this.ping();
      }
    }, this.pingIntervalTime);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      this.emit('max_reconnect_attempts', null);
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WS] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WS] Reconnect failed:', error);
      });
    }, this.reconnectDelay);
  }

  /**
   * Send message to server
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[WS] Cannot send message, not connected');
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string): void {
    this.send({
      type: 'JOIN_ROOM',
      payload: { roomId }
    });
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    this.send({
      type: 'LEAVE_ROOM'
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    this.send({ type: 'PING' });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    const { type, payload } = message;
    console.log(`[WS Client] Received message type: ${type}`, payload);
    this.emit(type, payload);
  }

  /**
   * Register message handler
   */
  on(type: string, handler: WebSocketMessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  /**
   * Unregister message handler
   */
  off(type: string, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(type: string, payload: any): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[WS] Handler error for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClientInstance: WebSocketClient | null = null;

export function initWebSocketClient(url: string, token: string): WebSocketClient {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
  }
  wsClientInstance = new WebSocketClient(url, token);
  return wsClientInstance;
}

export function getWebSocketClient(): WebSocketClient | null {
  return wsClientInstance;
}

export function disconnectWebSocket(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}
