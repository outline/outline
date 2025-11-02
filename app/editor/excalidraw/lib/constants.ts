/**
 * Excalidraw collaboration constants
 * Based on Excalidraw's collaboration implementation
 */

// Sync intervals
export const SYNC_FULL_SCENE_INTERVAL_MS = 20000; // 20 seconds
export const CURSOR_SYNC_TIMEOUT = 33; // ~30fps for cursor updates

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

// Error types
export enum CollabErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SYNC_FAILED = "SYNC_FAILED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  DOCUMENT_TOO_LARGE = "DOCUMENT_TOO_LARGE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

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