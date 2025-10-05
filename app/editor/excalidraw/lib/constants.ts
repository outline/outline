/**
 * Excalidraw collaboration constants
 * Based on Excalidraw's collaboration implementation
 */

// Sync intervals
export const SYNC_FULL_SCENE_INTERVAL_MS = 20000; // 20 seconds
export const CURSOR_SYNC_TIMEOUT = 33; // ~30fps for cursor updates
export const AWARENESS_UPDATE_THROTTLE = 100; // 100ms for awareness updates

// Timeouts
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000; // 5 seconds
export const LOAD_IMAGES_TIMEOUT = 500; // 500ms for image loading
export const COLLABORATION_RECONNECT_TIMEOUT = 3000; // 3 seconds
export const FILE_UPLOAD_TIMEOUT = 500; // 500ms for file upload throttle

// User states
export enum UserIdleState {
  ACTIVE = "ACTIVE",
  IDLE = "IDLE",
  AWAY = "AWAY"
}

// Connection states
export enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting"
}

// Update types for collaboration messages
export enum CollabUpdateType {
  INIT = "SCENE_INIT",
  UPDATE = "SCENE_UPDATE",
  MOUSE_LOCATION = "MOUSE_LOCATION",
  IDLE_STATUS = "IDLE_STATUS",
  USER_VISIBLE_SCENE_BOUNDS = "USER_VISIBLE_SCENE_BOUNDS"
}

// Collaboration event names
export const COLLAB_EVENTS = {
  AWARENESS_CHANGE: "awareness_change",
  SCENE_UPDATE: "scene_update",
  CONNECTION_STATUS: "connection_status",
  POINTER_UPDATE: "pointer_update",
  USER_STATE_CHANGE: "user_state_change"
} as const;

// Error types
export enum CollabErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SYNC_FAILED = "SYNC_FAILED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  DOCUMENT_TOO_LARGE = "DOCUMENT_TOO_LARGE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

// Y.js field names
export const Y_FIELDS = {
  ELEMENTS: "elements",
  APP_STATE: "appState",
  AWARENESS: "awareness"
} as const;

// Throttle/debounce settings
export const DEBOUNCE_DELAYS = {
  SAVE: 2000, // 2 seconds
  SYNC: 100, // 100ms
  AWARENESS: 50, // 50ms
  RECONNECT: 1000 // 1 second
} as const;

// Maximum retries for operations
export const MAX_RETRIES = {
  RECONNECT: 5,
  SYNC: 3,
  SAVE: 3
} as const;

// Default colors for users
export const DEFAULT_USER_COLORS = [
  "#1E90FF", // DodgerBlue
  "#FF6347", // Tomato
  "#32CD32", // LimeGreen
  "#FFD700", // Gold
  "#FF69B4", // HotPink
  "#9370DB", // MediumPurple
  "#00CED1", // DarkTurquoise
  "#FFA500", // Orange
  "#DC143C", // Crimson
  "#40E0D0"  // Turquoise
];

// App state fields that should be synced
export const SYNCABLE_APP_STATE_FIELDS = [
  "viewBackgroundColor",
  "gridSize",
  "zoom",
  "scrollX",
  "scrollY"
] as const;

export type SyncableAppStateField = typeof SYNCABLE_APP_STATE_FIELDS[number];