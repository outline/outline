/**
 * Portal class for managing Socket.io WebSocket connections
 * Based on Excalidraw's Portal implementation
 */

import {
  WS_SUBTYPES,
  type SocketUpdateData,
  type SocketUpdateDataSource,
  type ExcalidrawSocket,
  type OnUserFollowedPayload,
} from "./socket-types";

import {
  UserIdleState,
} from "./constants";

import type { ExcalidrawElement, OrderedExcalidrawElement, SocketId, SceneBounds } from "./types";
import { LRUCache } from "lru-cache";

export interface PortalCallbacks {
  onElementsChange: (elements: readonly ExcalidrawElement[], messageType?: string) => void;
  onCollaboratorsChange: (collaborators: SocketId[]) => void;
  onRoomUserChange: (clients: SocketId[]) => void;
  onNewUser: (socketId: string) => void;
  onFirstInRoom: () => void;
  onUserFollowRoomChange: (followedBy: SocketId[]) => void;
  onMouseLocation: (payload: {
    socketId: SocketId;
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "up" | "down";
    selectedElementIds: Record<string, boolean>;
    username: string;
  }) => void;
  onViewportUpdate: (payload: {
    socketId: SocketId;
    username: string;
    sceneBounds: SceneBounds;
  }) => void;
}

export class ExcalidrawPortal {
  socket: ExcalidrawSocket | null = null;
  socketInitialized: boolean = false;
  roomId: string | null = null;
  roomKey: string | null = null;
  broadcastedElementVersions: LRUCache<string, number> = new LRUCache({ max: 5000 }); // Limit to 5000 elements
  callbacks: PortalCallbacks | null = null;
  private listenersSetUp: boolean = false;

  constructor(callbacks: PortalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Opens a Socket.io connection and joins a room
   */
  open(socket: ExcalidrawSocket, roomId: string, roomKey: string): ExcalidrawSocket {
    this.socket = socket;
    this.roomId = roomId;
    this.roomKey = roomKey;

    // If socket is already connected, set flag immediately
    // This handles the case where portal.open() is called after socket connection (e.g., in onJoinedRoom callback)
    if (socket.connected) {
      this.socketInitialized = true;
    }

    // Only set up listeners once to prevent duplicates on reconnect
    if (!this.listenersSetUp) {
      this.setupSocketListeners();
      this.listenersSetUp = true;
    }
    return socket;
  }

  /**
   * Sets up all Socket.io event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Handle new user joining the room
    this.socket.on("excalidraw-new-user", (data: { socketId: string }) => {
      this.callbacks?.onNewUser(data.socketId);

      // Note: Broadcasting the current scene is handled by the collaboration orchestrator
      // in the handleNewUser callback, not here. This prevents empty broadcasts.
    });

    // Handle room user changes (collaborators list)
    this.socket.on("excalidraw-room-user-change", (_data: { collaborators: SocketId[] }) => {
      this.callbacks?.onRoomUserChange(_data.collaborators);
    });

    // Handle user leaving room
    this.socket.on("excalidraw-user-left", (data: { socketId: string }) => {
      // Actual cleanup is handled by excalidraw-room-user-change event
      // This handler is for logging and potential future cleanup logic
    });

    // Handle when user is first in room
    this.socket.on("excalidraw-first-in-room", () => {
      this.callbacks?.onFirstInRoom();
    });

    // Handle collaboration data (plain JSON over WSS)
    this.socket.on("excalidraw-client-broadcast", (_data: { payload: SocketUpdateData; socketId: string }) => {
      try {
        this.handleMessage(_data.payload);
      } catch (_error) {
        // Silent error handling
      }
    });

    // Handle user follow events
    this.socket.on("excalidraw-user-follow-change", (data: { followerId: string; followUserId?: string }) => {
      this.callbacks?.onUserFollowRoomChange([data.followerId]);
    });

    // Handle disconnection
    this.socket.on("disconnect", () => {
      this.socketInitialized = false;
    });

    // Handle connection
    this.socket.on("connect", () => {
      this.socketInitialized = true;
    });
  }

  /**
   * Handles collaboration messages
   */
  private handleMessage(data: SocketUpdateData): void {
    switch (data.type) {
      case WS_SUBTYPES.INVALID_RESPONSE:
        break;

      case WS_SUBTYPES.INIT:
      case WS_SUBTYPES.UPDATE:
        this.callbacks?.onElementsChange(data.payload.elements, data.type);
        break;

      case WS_SUBTYPES.MOUSE_LOCATION:
        // Update collaborator pointer position
        this.callbacks?.onMouseLocation(data.payload);
        break;

      case WS_SUBTYPES.IDLE_STATUS:
        break;

      case WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS:
        // Update viewport for users following this collaborator
        this.callbacks?.onViewportUpdate(data.payload);
        break;

      default:
        // Unknown message type
        break;
    }
  }

  /**
   * Closes the portal (socket is managed by ConnectionManager)
   */
  close(): void {
    if (!this.socket) {
      return;
    }

    // DO NOT close socket here - ConnectionManager owns it
    // Removing socket.close() to prevent double-close
    this.socket = null;
    this.roomId = null;
    this.roomKey = null;
    this.socketInitialized = false;
    this.listenersSetUp = false;
    this.broadcastedElementVersions.clear();
  }

  /**
   * Checks if the portal is open and ready
   */
  isOpen(): boolean {
    return !!(
      this.socketInitialized &&
      this.socket &&
      this.roomId &&
      this.roomKey
    );
  }

  /**
   * Broadcasts socket data (plain JSON over WSS)
   */
  broadcastSocketData(
    data: SocketUpdateData,
    _volatile: boolean = false,
    roomId?: string
  ): void {
    if (!this.isOpen()) {
      return;
    }

    this.socket!.emit("excalidraw-broadcast", {
      roomId: roomId ?? this.roomId,
      payload: data
    });
  }

  /**
   * Broadcasts scene elements to collaborators
   */
  broadcastScene(
    updateType: WS_SUBTYPES.INIT | WS_SUBTYPES.UPDATE,
    elements: readonly OrderedExcalidrawElement[],
    syncAll: boolean
  ): void {
    if (updateType === WS_SUBTYPES.INIT && !syncAll) {
      throw new Error("syncAll must be true when sending SCENE.INIT");
    }

    // Filter syncable elements based on version tracking
    const syncableElements = elements.filter((element) => {
      return (
        syncAll ||
        !this.broadcastedElementVersions.has(element.id) ||
        element.version > this.broadcastedElementVersions.get(element.id)!
      );
    });

    if (syncableElements.length === 0 && !syncAll) {
      return;
    }

    const data: SocketUpdateDataSource[typeof updateType] = {
      type: updateType,
      payload: {
        elements: syncableElements,
      },
    };

    // Update version tracking
    for (const element of syncableElements) {
      this.broadcastedElementVersions.set(element.id, element.version);
    }

    this.broadcastSocketData(data as SocketUpdateData);
  }

  /**
   * Broadcasts mouse location over WSS
   * Matches official Excalidraw pattern
   */
  broadcastMouseLocation(payload: {
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "up" | "down";
    selectedElementIds?: Record<string, boolean>;
    username?: string;
  }): void {
    if (!this.socket?.id) {
      return;
    }

    const data: SocketUpdateDataSource["MOUSE_LOCATION"] = {
      type: WS_SUBTYPES.MOUSE_LOCATION,
      payload: {
        socketId: this.socket.id as SocketId,
        pointer: payload.pointer,
        button: payload.button || "up",
        selectedElementIds: payload.selectedElementIds || {},
        username: payload.username || "Anonymous",
      },
    };

    this.broadcastSocketData(data as SocketUpdateData, true); // volatile
  }

  /**
   * Broadcasts idle status change
   */
  broadcastIdleChange(userState: UserIdleState, _username?: string): void {
    if (!this.socket?.id || !this.roomId) {
      return;
    }

    this.socket.emit("excalidraw-idle-status", {
      roomId: this.roomId,
      userState,
    });
  }

  /**
   * Broadcasts visible scene bounds
   */
  broadcastVisibleSceneBounds(
    payload: { sceneBounds: SceneBounds },
    roomId: string,
    username?: string
  ): void {
    if (!this.socket?.id) {
      return;
    }

    const data: SocketUpdateDataSource["USER_VISIBLE_SCENE_BOUNDS"] = {
      type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS,
      payload: {
        socketId: this.socket.id as SocketId,
        username: username || "Anonymous",
        sceneBounds: payload.sceneBounds,
      },
    };

    this.broadcastSocketData(data as SocketUpdateData, true, roomId); // volatile
  }

  /**
   * Broadcasts user follow events
   */
  broadcastUserFollowed(payload: OnUserFollowedPayload): void {
    if (!this.socket?.id || !this.roomId) {
      return;
    }

    this.socket.emit("excalidraw-follow", {
      roomId: this.roomId,
      followUserId: payload.userToFollow,
    });
  }
}