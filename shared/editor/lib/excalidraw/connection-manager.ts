/**
 * Connection manager for Excalidraw collaboration
 * Handles Socket.io connection lifecycle, authentication, and reconnection
 */

import { ConnectionStatus, CollabErrorType, MAX_RETRIES } from "./constants";
import type { SocketId } from "./types";

export interface ConnectionCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (message: string, type: CollabErrorType) => void;
  onAuthenticated: () => void;
  onJoinedRoom: (data: { roomId: string; collaborators: string[]; isFirstInRoom: boolean }) => void;
  onFirstInRoom: () => void;
  onNewUser: (socketId: SocketId) => void;
}

export interface ConnectionConfig {
  serverUrl: string;
  roomId: string;
  documentId: string;
  excalidrawDataId: string;
  collaborationToken?: string;
}

export class ConnectionManager {
  private socket: any = null; // Socket.io client type
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectTimeoutId?: NodeJS.Timeout;
  private retryCount: number = 0;
  private isDestroyed: boolean = false;

  constructor(
    private config: ConnectionConfig,
    private callbacks: ConnectionCallbacks
  ) {}

  /**
   * Establish Socket.io connection
   */
  async connect(): Promise<void> {
    if (this.socket || this.isDestroyed) {
      return;
    }

    try {
      this.updateStatus(ConnectionStatus.CONNECTING);

      // Dynamically import Socket.io client
      const { default: socketIOClient } = await import("socket.io-client");

      console.log(`[ConnectionManager] Connecting to: ${this.config.serverUrl}`);

      this.socket = socketIOClient(this.config.serverUrl, {
        path: "/realtime",
        transports: ["websocket", "polling"],
        withCredentials: true, // Include cookies for JWT auth
      });

      this.setupSocketListeners();

    } catch (error) {
      const message = `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.callbacks.onError(message, CollabErrorType.CONNECTION_FAILED);
      this.attemptReconnection();
    }
  }

  /**
   * Set up Socket.io event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[ConnectionManager] Socket connected");
      this.updateStatus(ConnectionStatus.CONNECTED);
      this.retryCount = 0;
      this.callbacks.onConnect();
    });

    this.socket.on("disconnect", () => {
      console.log("[ConnectionManager] Socket disconnected");
      if (!this.isDestroyed) {
        this.updateStatus(ConnectionStatus.DISCONNECTED);
        this.callbacks.onDisconnect();
        this.attemptReconnection();
      }
    });

    this.socket.on("connect_error", (error: any) => {
      console.error("[ConnectionManager] Connection error:", error);
      if (!this.isDestroyed) {
        this.callbacks.onError("Connection error", CollabErrorType.CONNECTION_FAILED);
        this.attemptReconnection();
      }
    });

    this.socket.on("authenticated", () => {
      console.log("[ConnectionManager] Authentication successful");
      this.callbacks.onAuthenticated();

      // Join the Excalidraw room after authentication
      this.socket.emit("join-excalidraw-room", {
        roomId: this.config.roomId,
        documentId: this.config.documentId,
        excalidrawDataId: this.config.excalidrawDataId,
      });
    });

    this.socket.on("unauthorized", (data: { message: string }) => {
      console.error("[ConnectionManager] Authentication failed:", data.message);
      this.callbacks.onError("Authentication failed: " + data.message, CollabErrorType.AUTHENTICATION_FAILED);
    });

    this.socket.on("excalidraw-joined-room", (data: { roomId: string; documentId: string; collaborators: string[]; isFirstInRoom: boolean }) => {
      console.log("[ConnectionManager] Joined Excalidraw room:", data.roomId);
      this.callbacks.onJoinedRoom(data);
    });

    this.socket.on("excalidraw-first-in-room", () => {
      console.log("[ConnectionManager] First in room event received");
      this.callbacks.onFirstInRoom();
    });

    this.socket.on("excalidraw-new-user", (data: { socketId: string }) => {
      console.log("[ConnectionManager] New user joined:", data.socketId);
      this.callbacks.onNewUser(data.socketId);
    });

    this.socket.on("excalidraw-error", (data: { message: string }) => {
      console.error("[ConnectionManager] Excalidraw error:", data.message);
      this.callbacks.onError(data.message, CollabErrorType.CONNECTION_FAILED);
    });
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    if (this.socket) {
      // Gracefully leave the room before disconnecting
      if (this.socket.connected) {
        console.log("[ConnectionManager] Leaving Excalidraw room before disconnect");
        this.socket.emit("leave-excalidraw-room", {
          roomId: this.config.roomId
        });
      }

      // Close socket immediately (server handles cleanup asynchronously)
      this.socket.close();
      this.socket = null;
    }

    this.updateStatus(ConnectionStatus.DISCONNECTED);
    this.retryCount = 0;
  }

  /**
   * Destroy the connection manager
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.isDestroyed || this.retryCount >= MAX_RETRIES.RECONNECT) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Max 30 seconds
    console.log(`[ConnectionManager] Attempting reconnection in ${delay}ms (attempt ${this.retryCount + 1})`);

    this.updateStatus(ConnectionStatus.RECONNECTING);
    this.retryCount++;

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Update connection status
   */
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get the Socket.io client instance
   */
  getSocket(): any {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED && this.socket?.connected;
  }
}
