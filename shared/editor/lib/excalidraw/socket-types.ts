/**
 * Socket.io types and constants for Excalidraw collaboration
 * Based on Excalidraw's collaboration implementation
 */

import type { UserIdleState } from "./constants";

// Type imports - using any for now due to module resolution issues
type ExcalidrawElement = any;
type SocketId = string;
type SceneBounds = any;

// WebSocket event names (matches excalidraw-app/app_constants.ts)
export const WS_EVENTS = {
  SERVER_VOLATILE: "server-volatile-broadcast",
  SERVER: "server-broadcast",
  USER_FOLLOW_CHANGE: "user-follow",
  USER_FOLLOW_ROOM_CHANGE: "user-follow-room-change",
} as const;

// WebSocket message subtypes (matches excalidraw-app/app_constants.ts)
export enum WS_SUBTYPES {
  INVALID_RESPONSE = "INVALID_RESPONSE",
  INIT = "SCENE_INIT",
  UPDATE = "SCENE_UPDATE",
  MOUSE_LOCATION = "MOUSE_LOCATION",
  IDLE_STATUS = "IDLE_STATUS",
  USER_VISIBLE_SCENE_BOUNDS = "USER_VISIBLE_SCENE_BOUNDS",
}

// User following types
export type UserToFollow = {
  socketId: SocketId;
  username: string;
};

export type OnUserFollowedPayload = {
  userToFollow: UserToFollow;
  action: "FOLLOW" | "UNFOLLOW";
};

// Socket update data source types
export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: WS_SUBTYPES.INVALID_RESPONSE;
  };
  SCENE_INIT: {
    type: WS_SUBTYPES.INIT;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  SCENE_UPDATE: {
    type: WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "up" | "down";
      selectedElementIds: Record<string, boolean>;
      username: string;
    };
  };
  IDLE_STATUS: {
    type: WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
};

// Union type for all socket update data
export type SocketUpdateData =
  | SocketUpdateDataSource["INVALID_RESPONSE"]
  | SocketUpdateDataSource["SCENE_INIT"]
  | SocketUpdateDataSource["SCENE_UPDATE"]
  | SocketUpdateDataSource["MOUSE_LOCATION"]
  | SocketUpdateDataSource["IDLE_STATUS"]
  | SocketUpdateDataSource["USER_VISIBLE_SCENE_BOUNDS"];

// Encrypted data structure
export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

// Socket.io client types
export type ExcalidrawSocket = {
  id: string;
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  close: () => void;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  volatile: {
    broadcast: {
      to: (room: string) => {
        emit: (event: string, ...args: any[]) => void;
      };
    };
  };
  broadcast: {
    to: (room: string) => {
      emit: (event: string, ...args: any[]) => void;
    };
  };
};

// Collaboration server configuration
export interface CollaborationServerConfig {
  url: string;
  transports: string[];
  cors?: {
    origin: string;
    credentials: boolean;
  };
}