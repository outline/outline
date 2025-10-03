/**
 * Collaborator manager for Excalidraw collaboration
 * Manages collaborator state, presence, and updates
 */

import throttle from "lodash/throttle";
import { CURSOR_SYNC_TIMEOUT, UserIdleState, DEFAULT_USER_COLORS } from "./constants";
import type { SocketId, ExcalidrawImperativeAPI, Collaborator } from "./types";
import type { ExcalidrawPortal } from "./portal";

interface ThrottledFunction {
  (payload: unknown): void;
  cancel(): void;
  flush(): void;
}

export class CollaboratorManager {
  private collaborators = new Map<SocketId, Collaborator>();
  private throttledPointerUpdate: ThrottledFunction | null = null;

  constructor(
    private portal: ExcalidrawPortal,
    private getExcalidrawAPI: () => ExcalidrawImperativeAPI | null,
    private username: string
  ) {
    this.initializeThrottledFunctions();
  }

  /**
   * Initialize throttled functions
   */
  private initializeThrottledFunctions(): void {
    this.throttledPointerUpdate = throttle(
      (payload: { pointer: { x: number; y: number }; button: "up" | "down" }) => {
        if (this.portal.isOpen()) {
          const api = this.getExcalidrawAPI();
          this.portal.broadcastMouseLocation({
            ...payload,
            selectedElementIds: api?.getAppState().selectedElementIds || {},
            username: this.username,
          });
        }
      },
      CURSOR_SYNC_TIMEOUT
    );
  }

  /**
   * Update pointer position
   */
  updatePointer(pointer: { x: number; y: number }, button: "up" | "down"): void {
    this.throttledPointerUpdate?.({ pointer, button });
  }

  /**
   * Update user idle state
   */
  updateUserState(userState: UserIdleState): void {
    if (this.portal.isOpen()) {
      this.portal.broadcastIdleChange(userState, this.username);
    }
  }

  /**
   * Handle room user change
   */
  handleRoomUserChange(collaborators: Array<{ socketId: string; userId: string; name: string }>): void {
    // Create NEW Map (immutable pattern)
    const newCollaborators = new Map<SocketId, Collaborator>();

    collaborators.forEach((collaborator, index) => {
      if (collaborator.socketId !== this.portal.socket?.id) {
        // Create NEW collaborator object
        newCollaborators.set(collaborator.socketId, {
          id: collaborator.userId,
          socketId: collaborator.socketId,
          username: collaborator.name,
          color: {
            background: DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length],
            stroke: DEFAULT_USER_COLORS[index % DEFAULT_USER_COLORS.length],
          },
          pointer: {
            x: 0,
            y: 0,
            tool: "pointer",
            renderCursor: true, // CRITICAL: This enables cursor rendering
          },
          button: "up",
          selectedElementIds: {},
          userState: UserIdleState.ACTIVE,
          isCurrentUser: false, // Explicit for remote collaborators
        });
      }
    });

    // Store NEW Map
    this.collaborators = newCollaborators;

    // Pass NEW Map to updateScene
    const api = this.getExcalidrawAPI();
    if (api) {
      api.updateScene({
        collaborators: newCollaborators,
        captureUpdate: false,
      });
    }
  }

  /**
   * Handle mouse location update from remote collaborator
   */
  handleMouseLocation(payload: {
    socketId: SocketId;
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "up" | "down";
    selectedElementIds: Record<string, boolean>;
    username: string;
  }): void {
    // Find the collaborator by socketId
    const collaborator = this.collaborators.get(payload.socketId);

    if (collaborator) {
      // Create NEW Map (immutable pattern)
      const collaborators = new Map(this.collaborators);

      // Create NEW collaborator object (immutable pattern)
      const updatedCollaborator = Object.assign({}, collaborator, {
        pointer: {
          ...payload.pointer,
          renderCursor: true, // CRITICAL: This enables cursor rendering
        },
        button: payload.button,
        selectedElementIds: payload.selectedElementIds,
        isCurrentUser: false, // Explicit for remote collaborators
      });

      // Set in NEW Map
      collaborators.set(payload.socketId, updatedCollaborator);

      // Store NEW Map
      this.collaborators = collaborators;

      // Pass NEW Map to updateScene
      const api = this.getExcalidrawAPI();
      if (api) {
        api.updateScene({
          collaborators,
          captureUpdate: false,
        });
      }
    }
  }

  /**
   * Get current collaborators
   */
  getCollaborators(): Map<SocketId, Collaborator> {
    return this.collaborators;
  }

  /**
   * Clear all collaborators
   */
  clear(): void {
    this.collaborators.clear();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.throttledPointerUpdate?.cancel?.();
    this.clear();
  }
}
