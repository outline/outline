/**
 * Awareness and cursor management for Excalidraw collaboration
 * Handles user presence, cursor positions, and selection indicators
 */

import { UserIdleState, DEFAULT_USER_COLORS } from "./constants";

export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
}

export interface AwarenessState {
  user: AwarenessUser;
  pointer: {
    x: number;
    y: number;
  };
  button: "up" | "down";
  selectedElementIds: Record<string, boolean>;
  userState: UserIdleState;
  lastSeen: number;
}

export interface CursorData {
  id: string;
  user: AwarenessUser;
  pointer: { x: number; y: number };
  button: "up" | "down";
  isActive: boolean;
  userState: UserIdleState;
}

export interface SelectionData {
  id: string;
  user: AwarenessUser;
  elementIds: string[];
  color: string;
}

/**
 * Converts HocuspocusProvider awareness states to Excalidraw collaborator format
 */
export function convertAwarenessToCollaborators(
  awarenessStates: Map<number, any>,
  localClientId: number
): Map<string, any> {
  const collaborators = new Map<string, any>();

  awarenessStates.forEach((state, clientId) => {
    if (clientId === localClientId) return; // Skip self

    const stateObj = state as AwarenessState;
    const socketId = `client-${clientId}`;

    collaborators.set(socketId, {
      id: socketId,
      pointer: {
        x: stateObj.pointer?.x || 0,
        y: stateObj.pointer?.y || 0,
        tool: "pointer" as const,
      },
      button: stateObj.button || "up",
      selectedElementIds: stateObj.selectedElementIds || {},
      username: stateObj.user?.name || `User ${clientId}`,
      userState: stateObj.userState || UserIdleState.ACTIVE,
      color: {
        background: stateObj.user?.color || DEFAULT_USER_COLORS[clientId % DEFAULT_USER_COLORS.length],
        stroke: stateObj.user?.color || DEFAULT_USER_COLORS[clientId % DEFAULT_USER_COLORS.length],
      },
      socketId,
      isCurrentUser: false,
    });
  });

  return collaborators;
}

/**
 * Creates a live cursor data structure for rendering
 */
export function createCursorData(
  awarenessStates: Map<number, any>,
  localClientId: number
): CursorData[] {
  const cursors: CursorData[] = [];
  const now = Date.now();

  awarenessStates.forEach((state, clientId) => {
    if (clientId === localClientId) return; // Skip self

    const stateObj = state as AwarenessState;

    // Only show cursors for active users or recently active
    const isRecent = stateObj.lastSeen && (now - stateObj.lastSeen) < 30000; // 30 seconds
    const isActive = stateObj.userState === UserIdleState.ACTIVE;

    if (isActive || isRecent) {
      cursors.push({
        id: `cursor-${clientId}`,
        user: stateObj.user || {
          id: `user-${clientId}`,
          name: `User ${clientId}`,
          color: DEFAULT_USER_COLORS[clientId % DEFAULT_USER_COLORS.length],
          isLocal: false,
        },
        pointer: stateObj.pointer || { x: 0, y: 0 },
        button: stateObj.button || "up",
        isActive,
        userState: stateObj.userState || UserIdleState.IDLE,
      });
    }
  });

  return cursors;
}

/**
 * Creates selection data for rendering selection indicators
 */
export function createSelectionData(
  awarenessStates: Map<number, any>,
  localClientId: number
): SelectionData[] {
  const selections: SelectionData[] = [];

  awarenessStates.forEach((state, clientId) => {
    if (clientId === localClientId) return; // Skip self

    const stateObj = state as AwarenessState;
    const selectedElementIds = Object.keys(stateObj.selectedElementIds || {});

    if (selectedElementIds.length > 0) {
      selections.push({
        id: `selection-${clientId}`,
        user: stateObj.user || {
          id: `user-${clientId}`,
          name: `User ${clientId}`,
          color: DEFAULT_USER_COLORS[clientId % DEFAULT_USER_COLORS.length],
          isLocal: false,
        },
        elementIds: selectedElementIds,
        color: stateObj.user?.color || DEFAULT_USER_COLORS[clientId % DEFAULT_USER_COLORS.length],
      });
    }
  });

  return selections;
}

/**
 * Updates local awareness state with new information
 */
export function updateLocalAwareness(
  awareness: any, // HocuspocusProvider awareness
  updates: Partial<{
    pointer: { x: number; y: number };
    button: "up" | "down";
    selectedElementIds: Record<string, boolean>;
    userState: UserIdleState;
  }>
): void {
  const currentState = awareness.getLocalState() || {};

  const newState = {
    ...currentState,
    ...updates,
    lastSeen: Date.now(),
  };

  awareness.setLocalState(newState);
}

/**
 * Sets up initial awareness state for a user
 */
export function initializeAwareness(
  awareness: any, // HocuspocusProvider awareness
  user: AwarenessUser
): void {
  awareness.setLocalState({
    user,
    pointer: { x: 0, y: 0 },
    button: "up" as const,
    selectedElementIds: {},
    userState: UserIdleState.ACTIVE,
    lastSeen: Date.now(),
  });
}

/**
 * Cleans up awareness state when disconnecting
 */
export function cleanupAwareness(awareness: any): void {
  if (awareness) {
    awareness.setLocalState(null);
  }
}

/**
 * Throttled pointer update function factory
 */
export function createThrottledPointerUpdate(
  awareness: any,
  throttleMs: number = 50
) {
  let lastUpdate = 0;

  return (pointer: { x: number; y: number }, button: "up" | "down") => {
    const now = Date.now();
    if (now - lastUpdate < throttleMs) {
      return;
    }
    lastUpdate = now;

    updateLocalAwareness(awareness, { pointer, button });
  };
}

/**
 * Debounced selection update function factory
 */
export function createDebouncedSelectionUpdate(
  awareness: any,
  debounceMs: number = 100
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (selectedElementIds: Record<string, boolean>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      updateLocalAwareness(awareness, { selectedElementIds });
      timeoutId = null;
    }, debounceMs);
  };
}

/**
 * Gets a deterministic color for a user based on their ID
 */
export function getUserColor(userId: string | number): string {
  const hash = typeof userId === 'string'
    ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : userId;

  return DEFAULT_USER_COLORS[hash % DEFAULT_USER_COLORS.length];
}