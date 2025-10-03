/**
 * Main Excalidraw collaboration orchestrator (Refactored)
 * Coordinates connection, element sync, and collaborator management
 */

import { ExcalidrawPortal, type PortalCallbacks } from "./portal";
import { ConnectionManager, type ConnectionCallbacks } from "./connection-manager";
import { ElementSyncManager } from "./element-sync-manager";
import { CollaboratorManager } from "./collaborator-manager";
import {
  UserIdleState,
  ConnectionStatus,
  CollabErrorType,
} from "./constants";
import type { ExcalidrawElement, OrderedExcalidrawElement, AppState, ExcalidrawImperativeAPI, SocketId } from "./types";
import type { Collaborator } from "./collaborator-manager";

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
  excalidrawDataId: string;
  collaborationServerUrl?: string;
  roomKey?: string;
  username?: string;
  collaborationToken?: string;
}

export class ExcalidrawCollaboration {
  private portal: ExcalidrawPortal;
  private connectionManager: ConnectionManager | null = null;
  private elementSyncManager: ElementSyncManager | null = null;
  private collaboratorManager: CollaboratorManager | null = null;
  private excalidrawAPI: ExcalidrawImperativeAPI | null = null;
  private state: CollaborationState;
  private callbacks: CollaborationCallbacks;
  private config: ExcalidrawCollaborationConfig;
  private isDestroyed = false;
  private roomKey: string = "";

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
        this.elementSyncManager?.handleRemoteElementsChange(elements, messageType);
      },
      onCollaboratorsChange: () => {
        // Handled by onRoomUserChange
      },
      onRoomUserChange: (collaborators: any) => {
        this.collaboratorManager?.handleRoomUserChange(collaborators);
        this.updateState({
          collaborators: this.collaboratorManager?.getCollaborators() || new Map(),
        });
      },
      onNewUser: () => {
        this.elementSyncManager?.handleNewUser();
      },
      onFirstInRoom: () => {
        console.log("[Collaboration] First in room");
      },
      onUserFollowRoomChange: () => {
        // Handle viewport following if needed
      },
      onMouseLocation: (payload) => {
        this.collaboratorManager?.handleMouseLocation(payload);
      },
    };

    this.portal = new ExcalidrawPortal(portalCallbacks);
  }

  /**
   * Set the Excalidraw API instance
   */
  setExcalidrawAPI(api: ExcalidrawImperativeAPI): void {
    this.excalidrawAPI = api;
  }

  /**
   * Get the Excalidraw API instance
   */
  private getExcalidrawAPI = (): ExcalidrawImperativeAPI | null => {
    return this.excalidrawAPI;
  };

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

      // Generate room ID and key
      const roomId = this.generateRoomId();
      const roomKey = this.config.roomKey || await this.generateRoomKey();

      // Store roomKey for use in onJoinedRoom callback
      this.roomKey = roomKey;

      // Get server URL
      const serverUrl = this.config.collaborationServerUrl || this.getDefaultServerUrl();

      // Create connection manager
      const connectionCallbacks: ConnectionCallbacks = {
        onConnect: () => {
          // Don't set CONNECTED yet - wait for room join
          console.log("[Collaboration] Socket connected, waiting for room join");
        },
        onDisconnect: () => {
          this.updateState({
            connectionStatus: ConnectionStatus.DISCONNECTED,
          });
        },
        onError: (message: string, type: CollabErrorType) => {
          this.handleError(message, type);
        },
        onAuthenticated: () => {
          console.log("[Collaboration] Authentication successful");
        },
        onJoinedRoom: (data) => {
          console.log("[Collaboration] Joined Excalidraw room:", data.roomId, "isFirstInRoom:", data.isFirstInRoom, "collaborators:", data.collaborators);

          // Initialize portal and managers AFTER room join confirmation
          // This prevents race condition where broadcasts happen before room membership
          const socket = this.connectionManager?.getSocket();
          if (socket) {
            console.log("[Collaboration] Initializing portal with roomId:", data.roomId, "socket:", socket.id);

            // Open portal connection
            this.portal.open(socket, data.roomId, this.roomKey);

            // Initialize managers
            this.elementSyncManager = new ElementSyncManager(
              this.portal,
              this.getExcalidrawAPI
            );

            this.collaboratorManager = new CollaboratorManager(
              this.portal,
              this.getExcalidrawAPI,
              this.config.username || "Anonymous"
            );

            console.log("[Collaboration] Portal initialized, isOpen:", this.portal.isOpen());

            // NOW we're truly connected and ready to collaborate
            this.updateState({
              connectionStatus: ConnectionStatus.CONNECTED,
              isCollaborating: true,
              error: null,
            });
          } else {
            console.error("[Collaboration] No socket available for portal initialization!");
          }

          if (data.isFirstInRoom) {
            console.log("[Collaboration] First in room");
          }
        },
        onFirstInRoom: () => {
          console.log("[Collaboration] First in room event");
        },
        onNewUser: (socketId) => {
          console.log(`[Collaboration] New user joined: ${socketId}`);
          this.elementSyncManager?.handleNewUser();
        },
      };

      this.connectionManager = new ConnectionManager(
        {
          serverUrl,
          roomId,
          documentId: this.config.documentId,
          excalidrawDataId: this.config.excalidrawDataId,
          collaborationToken: this.config.collaborationToken,
        },
        connectionCallbacks
      );

      await this.connectionManager.connect();

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

    // Destroy managers
    this.elementSyncManager?.destroy();
    this.collaboratorManager?.destroy();
    this.connectionManager?.destroy();

    // Close portal
    this.portal.close();

    // Reset managers
    this.elementSyncManager = null;
    this.collaboratorManager = null;
    this.connectionManager = null;

    // Reset state
    this.updateState({
      isCollaborating: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      collaborators: new Map(),
      error: null,
      retryCount: 0,
    });
  }

  /**
   * Destroy the collaboration instance
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stopCollaboration();
  }

  /**
   * Sync elements to other collaborators
   */
  syncElements(elements: OrderedExcalidrawElement[], _appState: AppState): void {
    console.log("[Collaboration] syncElements called, elements:", elements.length, "elementSyncManager:", !!this.elementSyncManager);
    this.elementSyncManager?.syncElements(elements);
  }

  /**
   * Update pointer position
   */
  updatePointer(pointer: { x: number; y: number }, button: string): void {
    this.collaboratorManager?.updatePointer(pointer, button);
  }

  /**
   * Update user idle state
   */
  updateUserState(userState: UserIdleState): void {
    this.collaboratorManager?.updateUserState(userState);
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
   * Generate room ID - uses diagram UUID directly for simplicity
   */
  private generateRoomId(): string {
    return this.config.excalidrawId;
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
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    return "http://localhost:3002";
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
