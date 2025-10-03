/**
 * Utilities for extracting and embedding Excalidraw scene data in SVG
 */

import { loadSceneOrLibraryFromBlob, MIME_TYPES } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, AppState } from "./types";

export interface ExcalidrawScene {
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
}

/**
 * Extract Excalidraw scene data from SVG metadata using Excalidraw's native import
 * This handles all encoding formats including bstring compression
 */
export async function extractSceneFromSVG(svgString: string): Promise<ExcalidrawScene | null> {
  try {
    // Convert SVG string to Blob
    const blob = new Blob([svgString], { type: MIME_TYPES.svg });

    // Use Excalidraw's built-in import function
    // This handles base64 decoding, bstring decompression, and data restoration
    const contents = await loadSceneOrLibraryFromBlob(blob, null, null);

    if (contents.type === MIME_TYPES.excalidraw) {
      console.log('[svgExtractor] Successfully loaded scene from SVG, elements:', contents.data.elements.length);

      return {
        elements: contents.data.elements || [],
        appState: contents.data.appState || {},
      };
    }

    console.warn('[svgExtractor] SVG does not contain Excalidraw scene data');
    return null;
  } catch (error) {
    console.error("[svgExtractor] Failed to extract scene from SVG:", error);
    return null;
  }
}

/**
 * Check if an SVG contains embedded Excalidraw scene data
 */
export function hasEmbeddedScene(svgString: string): boolean {
  return /<!--\s*payload-start\s*-->/.test(svgString);
}

/**
 * Get empty SVG placeholder for a new Excalidraw diagram
 */
export function getEmptyExcalidrawSVG(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff"/>
  <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="20" fill="#aaa">
    Click to start drawing
  </text>
</svg>`;
}
