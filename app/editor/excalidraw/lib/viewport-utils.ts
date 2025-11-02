/**
 * Viewport utilities for Excalidraw collaboration
 * Handles viewport bounds calculation and transformations for follow feature
 */

import type { AppState, SceneBounds } from "./types";

/**
 * Calculates the visible scene bounds from the current viewport state
 * Based on Excalidraw's getVisibleSceneBounds implementation
 *
 * @param appState - Current Excalidraw application state
 * @returns SceneBounds representing the visible area in scene coordinates
 */
export function getVisibleSceneBounds(appState: AppState): SceneBounds {
  const { scrollX, scrollY, width, height, zoom } = appState;

  // Convert viewport coordinates to scene coordinates
  // Scene coordinates = (viewport coordinates - scroll) / zoom
  const viewportWidth = width || 0;
  const viewportHeight = height || 0;
  const zoomValue = zoom?.value || 1;

  // Calculate scene bounds from viewport
  // Top-left corner
  const minX = -scrollX / zoomValue;
  const minY = -scrollY / zoomValue;

  // Bottom-right corner
  const maxX = (viewportWidth - scrollX) / zoomValue;
  const maxY = (viewportHeight - scrollY) / zoomValue;

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

/**
 * Calculates scroll and zoom values to fit given bounds in viewport
 * Based on Excalidraw's zoomToFitBounds implementation
 *
 * @param bounds - Scene bounds to fit
 * @param appState - Current application state for viewport dimensions
 * @returns Partial AppState with updated scrollX, scrollY, and zoom
 */
export function calculateViewportToFitBounds(
  bounds: SceneBounds,
  appState: AppState
): Partial<AppState> {
  const { width, height } = appState;
  const viewportWidth = width || 0;
  const viewportHeight = height || 0;

  // Calculate bounds dimensions
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;

  // Calculate zoom to fit bounds (with some padding)
  const PADDING_FACTOR = 0.9; // 90% of viewport to leave some margin
  const zoomX = (viewportWidth * PADDING_FACTOR) / boundsWidth;
  const zoomY = (viewportHeight * PADDING_FACTOR) / boundsHeight;

  // Use the smaller zoom to ensure everything fits
  const zoom = Math.min(zoomX, zoomY, 1); // Cap at 100% zoom

  // Calculate center of bounds
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Calculate scroll to center the bounds
  const scrollX = -(centerX * zoom - viewportWidth / 2);
  const scrollY = -(centerY * zoom - viewportHeight / 2);

  return {
    scrollX,
    scrollY,
    zoom: { value: zoom },
  };
}
