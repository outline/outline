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
} from "@excalidraw/excalidraw/types/element/types";

export type {
  AppState,
  BinaryFiles,
  DataURL,
  UIAppState,
  Zoom,
} from "@excalidraw/excalidraw/types/types";

export type {
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types/types";

// Collaboration types - use official Excalidraw types
export type {
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";

// Scene types
export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
