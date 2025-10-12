/**
 * Type definitions for Excalidraw integration
 * Properly typed imports from @excalidraw/excalidraw package
 */

// Core Excalidraw types
export type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
  NonDeletedExcalidrawElement,
  ExcalidrawBindableElement,
  ExcalidrawTextElement,
  ExcalidrawLinearElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawImageElement,
  ExcalidrawFrameElement,
  ExcalidrawMagicFrameElement,
  ExcalidrawEmbeddableElement,
  ExcalidrawTextContainer,
  ExcalidrawArrowElement,
  FileId,
  ExcalidrawElementType,
} from "@excalidraw/excalidraw/dist/types/excalidraw/element/types";

export type {
  AppState,
  BinaryFiles,
  DataURL,
  UIAppState,
  Zoom,
} from "@excalidraw/excalidraw/dist/types/excalidraw/types";

export type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/dist/types/excalidraw/types";

// Collaboration types - use official Excalidraw types
export type {
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/dist/types/excalidraw/types";

// Scene types
export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// User following types (re-exported from socket-types for convenience)
export type { UserToFollow } from "./socket-types";
