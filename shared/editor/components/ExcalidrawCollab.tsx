/**
 * Excalidraw Collaboration Manager
 * Handles real-time collaboration state, connections, and synchronization
 */

import * as React from "react";
import { useEffect, useRef, useCallback, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import throttle from "lodash/throttle";
import * as Y from "yjs";

// Type imports - using any for now due to module resolution issues
// These will be resolved when the build system processes the imports
type ExcalidrawElement = any;
type AppState = any;
type ExcalidrawImperativeAPI = any;

import {
  ConnectionStatus,
  UserIdleState,
  CURSOR_SYNC_TIMEOUT,
  SYNC_FULL_SCENE_INTERVAL_MS,
  AWARENESS_UPDATE_THROTTLE,
  COLLABORATION_RECONNECT_TIMEOUT,
  Y_FIELDS,
  DEBOUNCE_DELAYS,
  MAX_RETRIES,
  DEFAULT_USER_COLORS,
  CollabErrorType
} from "../lib/excalidraw/constants";

import {
  reconcileElements,
  reconcileAppState,
  createVersionMap,
  filterSyncableElements,
  detectElementChanges,
  type ElementUpdate
} from "../lib/excalidraw/reconcile";

import {
  convertAwarenessToCollaborators,
  createCursorData,
  createSelectionData,
  updateLocalAwareness,
  initializeAwareness,
  cleanupAwareness,
  createThrottledPointerUpdate,
  createDebouncedSelectionUpdate,
  getUserColor,
  type AwarenessUser
} from "../lib/excalidraw/awareness";

export interface CollaboratorInfo {
  id: string;
  socketId: string;
  name: string;
  color: string;
  pointer: { x: number; y: number };
  button: "up" | "down";
  selectedElementIds: Record<string, boolean>;
  userState: UserIdleState;
  isCurrentUser: boolean;
}

export interface CollabState {
  connectionStatus: ConnectionStatus;
  collaborators: Map<string, CollaboratorInfo>;
  isCollaborating: boolean;
  error: string | null;
  retryCount: number;
}

export interface CollabAPI {
  startCollaboration: () => Promise<void>;
  stopCollaboration: () => void;
  updatePointer: (pointer: { x: number; y: number }, button: string) => void;
  updateUserState: (state: UserIdleState) => void;
  updateSelection: (selectedElementIds: Record<string, boolean>) => void;
  syncElements: (elements: ExcalidrawElement[], appState: Partial<AppState>) => void;
  getCollaborators: () => Map<string, CollaboratorInfo>;
  getConnectionStatus: () => ConnectionStatus;
  isCollaborating: () => boolean;
}

interface Props {
  documentId: string;
  excalidrawId: string;
  collaborationToken: string;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  yDoc?: Y.Doc;
  onStateChange?: (state: CollabState) => void;
  onError?: (error: string, type: CollabErrorType) => void;
  userName?: string;
  collaborationUrl?: string;
}

export const ExcalidrawCollab = React.forwardRef<CollabAPI, Props>((
  {
    documentId,
    excalidrawId,
    collaborationToken,
    excalidrawAPI,
    yDoc: parentYDoc,
    onStateChange,
    onError,
    userName = "User",
    collaborationUrl
  },
  ref
) => {
  // Core collaboration state
  const [collabState, setCollabState] = useState<CollabState>({
    connectionStatus: ConnectionStatus.DISCONNECTED,
    collaborators: new Map(),
    isCollaborating: false,
    error: null,
    retryCount: 0
  });

  // Refs for managing lifecycle and preventing memory leaks
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const yElementsRef = useRef<Y.Array<ExcalidrawElement> | null>(null);
  const yAppStateRef = useRef<Y.Map<unknown> | null>(null);
  const isMountedRef = useRef(true);
  const ignoreRemoteUpdates = useRef(false);
  const lastSyncedVersions = useRef<Map<string, number>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userColorRef = useRef<string>(
    DEFAULT_USER_COLORS[Math.floor(Math.random() * DEFAULT_USER_COLORS.length)]
  );
  const throttledPointerUpdateRef = useRef<((pointer: { x: number; y: number }, button: string) => void) | null>(null);
  const debouncedSelectionUpdateRef = useRef<((selectedElementIds: Record<string, boolean>) => void) | null>(null);

  // Update parent component when state changes
  useEffect(() => {
    onStateChange?.(collabState);
  }, [collabState, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const updateCollabState = useCallback((updates: Partial<CollabState>) => {
    if (!isMountedRef.current) return;
    setCollabState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((message: string, type: CollabErrorType) => {
    console.error(`Excalidraw Collaboration Error (${type}):`, message);
    updateCollabState({ error: message });
    onError?.(message, type);
  }, [updateCollabState, onError]);

  // Enhanced pointer and selection update functions will be created during initialization

  // Handle awareness changes (collaborators)
  const handleAwarenessChange = useCallback(() => {
    if (!providerRef.current?.awareness || !isMountedRef.current) return;

    const states = providerRef.current.awareness.getStates();
    const localClientId = providerRef.current.awareness.clientID;

    // Convert awareness states to collaborator info
    const newCollaborators = new Map<string, CollaboratorInfo>();

    states.forEach((state, clientId) => {
      if (clientId === localClientId) return; // Skip self

      const stateObj = state as {
        pointer?: { x: number; y: number };
        button?: string;
        user?: { name?: string; color?: string };
        selectedElementIds?: Record<string, boolean>;
        userState?: UserIdleState;
        lastSeen?: number;
      };

      const socketId = `client-${clientId}`;
      const userColor = stateObj.user?.color || getUserColor(clientId);

      newCollaborators.set(socketId, {
        id: socketId,
        socketId,
        name: stateObj.user?.name || `User ${clientId}`,
        color: userColor,
        pointer: stateObj.pointer || { x: 0, y: 0 },
        button: (stateObj.button as "up" | "down") || "up",
        selectedElementIds: stateObj.selectedElementIds || {},
        userState: stateObj.userState || UserIdleState.ACTIVE,
        isCurrentUser: false
      });
    });

    updateCollabState({ collaborators: newCollaborators });

    // Update Excalidraw with collaborators using the awareness conversion utility
    if (excalidrawAPI) {
      const excalidrawCollaborators = convertAwarenessToCollaborators(states, localClientId);

      excalidrawAPI.updateScene({
        collaborators: excalidrawCollaborators,
        captureUpdate: false
      });
    }
  }, [updateCollabState, excalidrawAPI]);

  // Handle remote element changes
  const handleElementsChange = useCallback(async () => {
    if (ignoreRemoteUpdates.current || !excalidrawAPI || !yElementsRef.current || !isMountedRef.current) {
      return;
    }

    try {
      // Get remote elements
      const remoteElements = yElementsRef.current.toArray();
      const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();

      // Reconcile elements
      const reconcileResult = reconcileElements(localElements, remoteElements);

      if (reconcileResult.hasChanges) {
        // Update version tracking
        const newVersionMap = createVersionMap(reconcileResult.elements);
        lastSyncedVersions.current = newVersionMap;

        // Update Excalidraw without capturing for undo/redo
        excalidrawAPI.updateScene({
          elements: reconcileResult.elements,
          captureUpdate: false
        });
      }
    } catch (error) {
      handleError(
        `Failed to sync remote elements: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CollabErrorType.SYNC_FAILED
      );
    }
  }, [excalidrawAPI, handleError]);

  // Handle remote app state changes
  const handleAppStateChange = useCallback(async () => {
    if (ignoreRemoteUpdates.current || !excalidrawAPI || !yAppStateRef.current || !isMountedRef.current) {
      return;
    }

    try {
      const remoteAppState = Object.fromEntries(yAppStateRef.current.entries());
      const localAppState = excalidrawAPI.getAppState();

      const reconcileResult = reconcileAppState(localAppState, remoteAppState);

      if (reconcileResult.hasChanges) {
        excalidrawAPI.updateScene({
          appState: reconcileResult.appState,
          captureUpdate: false
        });
      }
    } catch (error) {
      handleError(
        `Failed to sync remote app state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CollabErrorType.SYNC_FAILED
      );
    }
  }, [excalidrawAPI, handleError]);

  // Throttled sync function
  const throttledSync = useCallback(
    throttle((elements: ExcalidrawElement[], appState: Partial<AppState>) => {
      if (!yDocRef.current || !yElementsRef.current || !yAppStateRef.current || !isMountedRef.current) {
        return;
      }

      ignoreRemoteUpdates.current = true;

      yDocRef.current.transact(() => {
        // Sync elements efficiently
        const currentElements = yElementsRef.current!.toArray();
        const updates = detectElementChanges(currentElements, elements);

        if (updates.length > 0) {
          // Clear and rebuild elements array for simplicity
          // In production, you might want to do more granular updates
          yElementsRef.current!.delete(0, yElementsRef.current!.length);
          yElementsRef.current!.insert(0, elements);

          // Update version tracking
          lastSyncedVersions.current = createVersionMap(elements);
        }

        // Sync app state
        Object.entries(appState).forEach(([key, value]) => {
          if (value !== undefined && yAppStateRef.current!.get(key) !== value) {
            yAppStateRef.current!.set(key, value);
          }
        });
      });

      setTimeout(() => {
        ignoreRemoteUpdates.current = false;
      }, 100);
    }, DEBOUNCE_DELAYS.SYNC),
    []
  );

  // Start collaboration
  const startCollaboration = useCallback(async () => {
    if (collabState.isCollaborating || !collaborationToken) return;

    try {
      updateCollabState({
        connectionStatus: ConnectionStatus.CONNECTING,
        error: null,
        retryCount: 0
      });

      // Create room name
      const roomName = `excalidraw.${documentId}.${excalidrawId}`;

      // Create Y.Doc
      const yDoc = parentYDoc || new Y.Doc();
      const yElements = yDoc.getArray(Y_FIELDS.ELEMENTS);
      const yAppState = yDoc.getMap(Y_FIELDS.APP_STATE);

      // Get collaboration URL
      const collabUrl = collaborationUrl ||
        (typeof window !== "undefined" ? `${window.location.origin}/collaboration` : "/collaboration");

      // Initialize optimized update handlers
      optimizedUpdateHandlersRef.current = createOptimizedUpdateHandlers();

      // Create provider
      const provider = new HocuspocusProvider({
        url: collabUrl,
        name: roomName,
        document: yDoc,
        token: collaborationToken,
        parameters: {
          editorVersion: "1.0.0"
        }
      });

      // Store refs
      providerRef.current = provider;
      yDocRef.current = yDoc;
      yElementsRef.current = yElements;
      yAppStateRef.current = yAppState;

      // Set up event listeners
      provider.on("status", ({ status }: { status: string }) => {
        const connectionStatus = status === "connected"
          ? ConnectionStatus.CONNECTED
          : status === "connecting"
            ? ConnectionStatus.CONNECTING
            : ConnectionStatus.DISCONNECTED;

        updateCollabState({ connectionStatus });

        if (status === "connected") {
          updateCollabState({
            isCollaborating: true,
            error: null,
            retryCount: 0
          });
        }
      });

      provider.on("connect", () => {
        updateCollabState({
          connectionStatus: ConnectionStatus.CONNECTED,
          isCollaborating: true,
          error: null
        });
      });

      provider.on("disconnect", () => {
        updateCollabState({
          connectionStatus: ConnectionStatus.DISCONNECTED
        });

        // Attempt reconnection
        if (collabState.retryCount < MAX_RETRIES.RECONNECT) {
          reconnectTimeoutRef.current = setTimeout(() => {
            updateCollabState({ retryCount: collabState.retryCount + 1 });
            provider.connect();
          }, COLLABORATION_RECONNECT_TIMEOUT);
        }
      });

      provider.on("authenticationFailed", () => {
        handleError("Authentication failed", CollabErrorType.AUTHENTICATION_FAILED);
      });

      // Set up Y.js observers
      yElements.observe(handleElementsChange);
      yAppState.observe(handleAppStateChange);
      provider.awareness.on("change", handleAwarenessChange);

      // Initialize awareness state
      const awarenessUser: AwarenessUser = {
        id: `user-${provider.awareness.clientID}`,
        name: userName,
        color: userColorRef.current,
        isLocal: true
      };
      initializeAwareness(provider.awareness, awarenessUser);

      // Set up throttled and debounced update functions
      throttledPointerUpdateRef.current = createThrottledPointerUpdate(
        provider.awareness,
        CURSOR_SYNC_TIMEOUT
      );
      debouncedSelectionUpdateRef.current = createDebouncedSelectionUpdate(
        provider.awareness,
        DEBOUNCE_DELAYS.AWARENESS
      );

    } catch (error) {
      handleError(
        `Failed to start collaboration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        CollabErrorType.CONNECTION_FAILED
      );
    }
  }, [
    collabState.isCollaborating,
    collabState.retryCount,
    collaborationToken,
    documentId,
    excalidrawId,
    parentYDoc,
    collaborationUrl,
    userName,
    updateCollabState,
    handleError,
    handleElementsChange,
    handleAppStateChange,
    handleAwarenessChange
  ]);

  // Stop collaboration
  const stopCollaboration = useCallback(() => {
    if (!collabState.isCollaborating) return;

    // Clear timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up provider
    if (providerRef.current) {
      if (yElementsRef.current) {
        yElementsRef.current.unobserve(handleElementsChange);
      }
      if (yAppStateRef.current) {
        yAppStateRef.current.unobserve(handleAppStateChange);
      }
      if (providerRef.current.awareness) {
        providerRef.current.awareness.off("change", handleAwarenessChange);
        cleanupAwareness(providerRef.current.awareness);
      }

      providerRef.current.destroy();
      providerRef.current = null;
    }

    // Reset refs
    yDocRef.current = null;
    yElementsRef.current = null;
    yAppStateRef.current = null;
    lastSyncedVersions.current.clear();

    // Reset state
    updateCollabState({
      connectionStatus: ConnectionStatus.DISCONNECTED,
      collaborators: new Map(),
      isCollaborating: false,
      error: null,
      retryCount: 0
    });
  }, [
    collabState.isCollaborating,
    updateCollabState,
    handleElementsChange,
    handleAppStateChange,
    handleAwarenessChange
  ]);

  // API for external components
  const collabAPI: CollabAPI = {
    startCollaboration,
    stopCollaboration,
    updatePointer: (pointer, button) => {
      if (throttledPointerUpdateRef.current) {
        throttledPointerUpdateRef.current(pointer, button);
      }
    },
    updateUserState: (state) => {
      if (!providerRef.current?.awareness) return;
      updateLocalAwareness(providerRef.current.awareness, { userState: state });
    },
    updateSelection: (selectedElementIds) => {
      if (debouncedSelectionUpdateRef.current) {
        debouncedSelectionUpdateRef.current(selectedElementIds);
      }
    },
    syncElements: throttledSync,
    getCollaborators: () => collabState.collaborators,
    getConnectionStatus: () => collabState.connectionStatus,
    isCollaborating: () => collabState.isCollaborating
  };

  // Expose API to parent component
  React.useImperativeHandle(ref, () => collabAPI, [collabAPI]);

  return null; // This is a headless component
});

ExcalidrawCollab.displayName = 'ExcalidrawCollab';

export default ExcalidrawCollab;