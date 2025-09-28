/**
 * Main Excalidraw collaboration orchestrator
 * Manages Socket.io connections, element synchronization, and cursors
 * Based on Excalidraw's Collab.tsx implementation
 */

import throttle from "lodash/throttle";
import { ExcalidrawPortal, type PortalCallbacks } from "./portal";
import {
  CURSOR_SYNC_TIMEOUT,
  SYNC_FULL_SCENE_INTERVAL_MS,
  INITIAL_SCENE_UPDATE_TIMEOUT,
  UserIdleState,
  ConnectionStatus,
  CollabErrorType,
  MAX_RETRIES,
  DEFAULT_USER_COLORS,
} from "./constants";

import {
  reconcileElements,
  reconcileAppState,
  createVersionMap,
  detectElementChanges,
} from "./reconcile";

import { WS_SUBTYPES } from "./socket-types";

// Type imports - using any for now due to module resolution issues
type ExcalidrawElement = any;
type OrderedExcalidrawElement = any;
type AppState = any;
type ExcalidrawImperativeAPI = any;
type SocketId = string;
type Collaborator = any;

export interface CollaborationState {
  isCollaborating: boolean;
  connectionStatus: ConnectionStatus;
  collaborators: Map<SocketId, Collaborator>;
  error: string | null;
  retryCount: number;
}

export interface CollaborationCallbacks {
  onStateChange?: (state: CollaborationState) => void;
  onError?: (message: string, type: CollabErrorType) => void;
}

export interface ExcalidrawCollaborationConfig {
  documentId: string;
  excalidrawId: string;
  collaborationServerUrl?: string;
  roomKey?: string;
  username?: string;
  collaborationToken?: string;
}

export class ExcalidrawCollaboration {
  private portal: ExcalidrawPortal;
  private excalidrawAPI: ExcalidrawImperativeAPI | null = null;
  private state: CollaborationState;
  private callbacks: CollaborationCallbacks;
  private config: ExcalidrawCollaborationConfig;

  // Tracking and timing
  private lastBroadcastedOrReceivedSceneVersion: number = -1;
  private collaborators = new Map<SocketId, Collaborator>();
  private socketInitializationTimer?: number;
  private reconnectTimeoutId?: NodeJS.Timeout;
  private isDestroyed = false;

  // Throttled functions
  private throttledPointerUpdate: ((payload: any) => void) | null = null;
  private queueBroadcastAllElements: (() => void) | null = null;

  constructor(config: ExcalidrawCollaborationConfig, callbacks: CollaborationCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;

    this.state = {
      isCollaborating: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      collaborators: new Map(),
      error: null,
      retryCount: 0,
    };

    // Initialize portal with callbacks
    const portalCallbacks: PortalCallbacks = {
      onElementsChange: (elements: readonly ExcalidrawElement[], messageType?: string) => {
        this.handleRemoteElementsChange(elements, messageType);
      },
      onCollaboratorsChange: this.handleCollaboratorsChange.bind(this),
      onRoomUserChange: this.handleRoomUserChange.bind(this),
      onNewUser: this.handleNewUser.bind(this),
      onFirstInRoom: this.handleFirstInRoom.bind(this),
      onUserFollowRoomChange: this.handleUserFollowRoomChange.bind(this),
    };

    this.portal = new ExcalidrawPortal(portalCallbacks);

    // Initialize throttled functions
    this.initializeThrottledFunctions();
  }

  /**
   * Initialize throttled functions
   */
  private initializeThrottledFunctions(): void {
    this.throttledPointerUpdate = throttle(
      (payload: { pointer: { x: number; y: number }; button: string }) => {
        if (this.portal.isOpen()) {
          this.portal.broadcastMouseLocation({
            ...payload,
            selectedElementIds: this.excalidrawAPI?.getAppState().selectedElementIds || {},
            username: this.config.username || "Anonymous",
          });
        }
      },
      CURSOR_SYNC_TIMEOUT
    );

    this.queueBroadcastAllElements = throttle(() => {
      if (this.excalidrawAPI && this.portal.isOpen()) {
        const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
        this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, true);
        this.lastBroadcastedOrReceivedSceneVersion = Math.max(
          this.lastBroadcastedOrReceivedSceneVersion,
          this.getSceneVersion(elements)
        );
      }
    }, SYNC_FULL_SCENE_INTERVAL_MS);
  }

  /**
   * Set the Excalidraw API instance
   */
  setExcalidrawAPI(api: ExcalidrawImperativeAPI): void {
    this.excalidrawAPI = api;
  }

  /**
   * Start collaboration
   */
  async startCollaboration(): Promise<void> {
    if (this.state.isCollaborating || this.isDestroyed) {
      return;
    }

    try {
      this.updateState({
        connectionStatus: ConnectionStatus.CONNECTING,
        error: null,
        retryCount: 0,
      });

      // Generate room ID
      const roomId = this.generateRoomId();
      const roomKey = this.config.roomKey || await this.generateRoomKey();

      // Import and initialize Socket.io client
      const { default: socketIOClient } = await import("socket.io-client");

      const serverUrl = this.config.collaborationServerUrl || this.getDefaultServerUrl();
      console.log(`[Collaboration] Connecting to: ${serverUrl}`);

      const socket = socketIOClient(serverUrl, {
        path: "/realtime",
        transports: ["websocket", "polling"],
        withCredentials: true, // Include cookies for JWT auth
      });

      // Set up connection event handlers
      socket.on("connect", () => {
        console.log("[Collaboration] Socket connected");
        this.updateState({
          connectionStatus: ConnectionStatus.CONNECTED,
          isCollaborating: true,
          error: null,
        });
      });

      socket.on("disconnect", () => {
        console.log("[Collaboration] Socket disconnected");
        // Only attempt reconnection if we're still supposed to be collaborating
        if (!this.isDestroyed && this.state.isCollaborating) {
          this.updateState({
            connectionStatus: ConnectionStatus.DISCONNECTED,
          });
          this.attemptReconnection();
        }
      });

      socket.on("connect_error", (error: any) => {
        console.error("[Collaboration] Connection error:", error);
        // Only attempt reconnection if we're still supposed to be collaborating
        if (!this.isDestroyed && this.state.isCollaborating) {
          this.handleError("Failed to connect to collaboration server", CollabErrorType.CONNECTION_FAILED);
          this.attemptReconnection();
        }
      });

      // Open portal connection
      this.portal.open(socket as any, roomId, roomKey);

      // Set up authentication and room joining
      socket.on("authenticated", () => {
        console.log("[Collaboration] Authentication successful");
        // Join the Excalidraw room after authentication
        socket.emit("join-excalidraw-room", {
          roomId,
          documentId: this.config.documentId,
        });
      });

      socket.on("unauthorized", (data: { message: string }) => {
        console.error("[Collaboration] Authentication failed:", data.message);
        this.handleError("Authentication failed: " + data.message, CollabErrorType.CONNECTION_FAILED);
      });

      socket.on("excalidraw-joined-room", (data: { roomId: string; documentId: string; collaborators: string[]; isFirstInRoom: boolean }) => {
        console.log("[Collaboration] Joined Excalidraw room:", data.roomId);
        if (data.isFirstInRoom) {
          this.handleFirstInRoom();
        }
      });

      socket.on("excalidraw-first-in-room", () => {
        console.log("[Collaboration] First in room event received");
        this.handleFirstInRoom();
      });

      socket.on("excalidraw-error", (data: { message: string }) => {
        console.error("[Collaboration] Excalidraw error:", data.message);
        this.handleError(data.message, CollabErrorType.CONNECTION_FAILED);
      });

    } catch (error) {
      console.error("[Collaboration] Failed to start collaboration:", error);
      this.handleError(
        `Failed to start collaboration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CollabErrorType.CONNECTION_FAILED
      );
    }
  }

  /**
   * Stop collaboration
   */
  stopCollaboration(): void {
    console.log("[Collaboration] Stopping collaboration");

    // Clear timers first to prevent any pending reconnections
    if (this.socketInitializationTimer) {
      clearTimeout(this.socketInitializationTimer);
      this.socketInitializationTimer = undefined;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    // Close portal
    this.portal.close();

    // Reset state - always reset regardless of current state to ensure cleanup
    this.updateState({
      isCollaborating: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      collaborators: new Map(),
      error: null,
      retryCount: 0,
    });

    this.collaborators.clear();
    this.lastBroadcastedOrReceivedSceneVersion = -1;
  }

  /**
   * Destroy the collaboration instance
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stopCollaboration();

    // Cancel throttled functions
    if (this.throttledPointerUpdate) {
      this.throttledPointerUpdate.cancel?.();
    }
    if (this.queueBroadcastAllElements) {
      this.queueBroadcastAllElements.cancel?.();
    }
  }

  /**
   * Sync elements to other collaborators
   */
  syncElements(elements: OrderedExcalidrawElement[], appState: AppState): void {
    if (!this.portal.isOpen() || !this.excalidrawAPI) {
      return;
    }

    const currentVersion = this.getSceneVersion(elements);
    if (currentVersion > this.lastBroadcastedOrReceivedSceneVersion) {
      this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = currentVersion;
      this.queueBroadcastAllElements?.();
    }
  }

  /**
   * Update pointer position
   */
  updatePointer(pointer: { x: number; y: number }, button: string): void {
    this.throttledPointerUpdate?.({ pointer, button });
  }

  /**
   * Update user idle state
   */
  updateUserState(userState: UserIdleState): void {
    if (this.portal.isOpen()) {
      this.portal.broadcastIdleChange(userState, this.config.username);
    }
  }

  /**
   * Handle remote elements change
   */
  private handleRemoteElementsChange(elements: readonly ExcalidrawElement[], messageType?: string): void {
    if (!this.excalidrawAPI || this.isDestroyed) {
      return;
    }

    try {
      const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
      // Determine if this is a full sync (INIT) or partial sync (UPDATE)
      const isFullSync = messageType === WS_SUBTYPES.INIT;
      const reconciledElements = reconcileElements(localElements, elements as ExcalidrawElement[], isFullSync);

      if (reconciledElements.hasChanges) {
        // Update version tracking
        this.lastBroadcastedOrReceivedSceneVersion = this.getSceneVersion(reconciledElements.elements);

        // Update Excalidraw without capturing for undo/redo
        this.excalidrawAPI.updateScene({
          elements: reconciledElements.elements,
          captureUpdate: false, // Use NEVER equivalent
        });
      }
    } catch (error) {
      console.error("[Collaboration] Failed to handle remote elements:", error);
      this.handleError("Failed to sync remote changes", CollabErrorType.SYNC_FAILED);
    }
  }

  /**
   * Handle collaborators change
   */
  private handleCollaboratorsChange(collaboratorIds: SocketId[]): void {
    // This is handled by handleRoomUserChange
  }

  /**
   * Handle room user change
   */
  private handleRoomUserChange(collaborators: Array<{ socketId: string; userId: string; name: string }>): void {
    const newCollaborators = new Map<SocketId, Collaborator>();

    collaborators.forEach((collaborator, index) => {
      if (collaborator.socketId !== this.portal.socket?.id) {
        newCollaborators.set(collaborator.socketId, {
          id: collaborator.userId,
          socketId: collaborator.socketId,
          username: collaborator.name,
          color: {
            background: DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length],
            stroke: DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length],
          },
          pointer: { x: 0, y: 0, tool: "pointer" },
          button: "up",
          selectedElementIds: {},
          userState: UserIdleState.ACTIVE,
          isCurrentUser: false,
        });
      }
    });

    this.collaborators = newCollaborators;
    this.updateState({ collaborators: newCollaborators });

    // Update Excalidraw collaborators
    if (this.excalidrawAPI) {
      this.excalidrawAPI.updateScene({
        collaborators: newCollaborators,
        captureUpdate: false,
      });
    }
  }

  /**
   * Handle new user joining
   */
  private handleNewUser(socketId: string): void {
    console.log(`[Collaboration] New user joined: ${socketId}`);
    // Send current scene to new user
    if (this.excalidrawAPI) {
      const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
      this.portal.broadcastScene(WS_SUBTYPES.INIT, elements, true);
    }
  }

  /**
   * Handle being first in room
   */
  private handleFirstInRoom(): void {
    console.log("[Collaboration] First in room");
    // Clear initialization timer
    if (this.socketInitializationTimer) {
      clearTimeout(this.socketInitializationTimer);
      this.socketInitializationTimer = undefined;
    }
  }

  /**
   * Handle user follow room change
   */
  private handleUserFollowRoomChange(followedBy: SocketId[]): void {
    console.log(`[Collaboration] User follow room change:`, followedBy);
    // Handle viewport following logic here if needed
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.isDestroyed || this.state.retryCount >= MAX_RETRIES.RECONNECT) {
      return;
    }

    // Don't attempt reconnection if we're not currently collaborating
    if (!this.state.isCollaborating) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000); // Max 30 seconds
    console.log(`[Collaboration] Attempting reconnection in ${delay}ms (attempt ${this.state.retryCount + 1})`);

    this.updateState({
      connectionStatus: ConnectionStatus.RECONNECTING,
      retryCount: this.state.retryCount + 1,
    });

    this.reconnectTimeoutId = setTimeout(() => {
      // Double-check we're still supposed to be collaborating before reconnecting
      if (!this.isDestroyed && this.state.isCollaborating) {
        this.startCollaboration();
      }
    }, delay);
  }

  /**
   * Handle errors
   */
  private handleError(message: string, type: CollabErrorType): void {
    console.error(`[Collaboration] ${type}:`, message);
    this.updateState({ error: message });
    this.callbacks.onError?.(message, type);
  }

  /**
   * Update collaboration state
   */
  private updateState(updates: Partial<CollaborationState>): void {
    this.state = { ...this.state, ...updates };
    this.callbacks.onStateChange?.(this.state);
  }

  /**
   * Generate room ID
   */
  private generateRoomId(): string {
    return `excalidraw.${this.config.documentId}.${this.config.excalidrawId}`;
  }

  /**
   * Generate room key
   */
  private async generateRoomKey(): Promise<string> {
    try {
      const { getEncryptionFunctions } = await import("./encryption");
      const { generateEncryptionKey } = await getEncryptionFunctions();
      return generateEncryptionKey();
    } catch (error) {
      console.error("[Collaboration] Failed to generate encryption key:", error);
      // Fallback to simple key generation
      return this.generateSimpleKey();
    }
  }

  /**
   * Simple key generation fallback
   */
  private generateSimpleKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get default collaboration server URL
   */
  private getDefaultServerUrl(): string {
    // Try to get from environment or use the excalidraw-room server
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    return "http://localhost:3002"; // Default excalidraw-room port
  }

  /**
   * Get scene version for tracking
   */
  private getSceneVersion(elements: readonly ExcalidrawElement[]): number {
    // Simple version calculation based on element versions
    return elements.reduce((acc, element) => acc + (element.version || 0), 0);
  }

  /**
   * Get current collaboration state
   */
  getState(): CollaborationState {
    return { ...this.state };
  }

  /**
   * Check if currently collaborating
   */
  isCollaborating(): boolean {
    return this.state.isCollaborating;
  }
}