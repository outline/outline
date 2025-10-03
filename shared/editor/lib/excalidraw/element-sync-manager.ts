/**
 * Element synchronization manager for Excalidraw collaboration
 * Handles syncing elements between collaborators with version tracking
 */

import throttle from "lodash/throttle";
import { SYNC_FULL_SCENE_INTERVAL_MS } from "./constants";
import { reconcileElements } from "./reconcile";
import { WS_SUBTYPES } from "./socket-types";
import type { ExcalidrawElement, OrderedExcalidrawElement, ExcalidrawImperativeAPI } from "./types";
import type { ExcalidrawPortal } from "./portal";

export class ElementSyncManager {
  private lastBroadcastedOrReceivedSceneVersion: number = -1;
  private queueBroadcastAllElements: (() => void) | null = null;
  private isApplyingRemoteChanges: boolean = false;

  constructor(
    private portal: ExcalidrawPortal,
    private getExcalidrawAPI: () => ExcalidrawImperativeAPI | null
  ) {
    this.initializeThrottledFunctions();
  }

  /**
   * Initialize throttled broadcast function
   */
  private initializeThrottledFunctions(): void {
    this.queueBroadcastAllElements = throttle(() => {
      const api = this.getExcalidrawAPI();
      if (api && this.portal.isOpen()) {
        const elements = api.getSceneElementsIncludingDeleted();
        this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, true);
        this.lastBroadcastedOrReceivedSceneVersion = Math.max(
          this.lastBroadcastedOrReceivedSceneVersion,
          this.getSceneVersion(elements)
        );
      }
    }, SYNC_FULL_SCENE_INTERVAL_MS);
  }

  /**
   * Sync local elements to other collaborators
   */
  syncElements(elements: OrderedExcalidrawElement[]): void {
    // CRITICAL: Skip broadcasting if we're currently applying remote changes
    // This prevents infinite broadcast loops
    if (this.isApplyingRemoteChanges) {
      console.log("[ElementSyncManager] Skipping broadcast - applying remote changes");
      return;
    }

    console.log("[ElementSyncManager] syncElements called, portal open:", this.portal.isOpen());
    if (!this.portal.isOpen()) {
      console.warn("[ElementSyncManager] Portal not open, cannot sync");
      return;
    }

    const currentVersion = this.getSceneVersion(elements);
    console.log("[ElementSyncManager] Current version:", currentVersion, "Last version:", this.lastBroadcastedOrReceivedSceneVersion);
    if (currentVersion > this.lastBroadcastedOrReceivedSceneVersion) {
      console.log("[ElementSyncManager] Broadcasting UPDATE with", elements.length, "elements");
      this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = currentVersion;
      this.queueBroadcastAllElements?.();
    } else {
      console.log("[ElementSyncManager] Scene version not increased, skipping broadcast");
    }
  }

  /**
   * Handle remote elements change from other collaborators
   */
  handleRemoteElementsChange(elements: readonly ExcalidrawElement[], messageType?: string): void {
    console.log("[ElementSyncManager] Received remote elements:", elements.length, "type:", messageType, "IDs:", elements.map(e => e.id.substring(0, 8)).join(', '));
    const api = this.getExcalidrawAPI();
    if (!api) {
      console.warn("[ElementSyncManager] No API available");
      return;
    }

    try {
      // Set flag to prevent broadcast loop
      this.isApplyingRemoteChanges = true;

      const localElements = api.getSceneElementsIncludingDeleted();
      console.log("[ElementSyncManager] Current local elements:", localElements.length, "IDs:", localElements.map(e => e.id.substring(0, 8)).join(', '));

      // Determine if this is a full sync (INIT) or partial sync (UPDATE)
      const isFullSync = messageType === WS_SUBTYPES.INIT;
      const reconciledElements = reconcileElements(localElements, elements as ExcalidrawElement[], isFullSync);

      console.log("[ElementSyncManager] Reconciliation result - hasChanges:", reconciledElements.hasChanges, "elements:", reconciledElements.elements.length, "IDs:", reconciledElements.elements.map(e => e.id.substring(0, 8)).join(', '));

      if (reconciledElements.hasChanges) {
        // Update version tracking
        this.lastBroadcastedOrReceivedSceneVersion = this.getSceneVersion(reconciledElements.elements);

        console.log("[ElementSyncManager] Calling updateScene with", reconciledElements.elements.length, "elements");
        // Update Excalidraw - this will trigger onChange but we suppress broadcast with isApplyingRemoteChanges flag
        api.updateScene({
          elements: reconciledElements.elements,
        });
      } else {
        console.log("[ElementSyncManager] No changes detected, skipping UI update");
      }
    } catch (error) {
      console.error("[ElementSyncManager] Failed to handle remote elements:", error);
    } finally {
      // Clear flag after a tick to allow React to process the update
      // Using setTimeout to ensure onChange completes before we clear the flag
      setTimeout(() => {
        this.isApplyingRemoteChanges = false;
      }, 0);
    }
  }

  /**
   * Handle new user joining - send them current scene
   */
  handleNewUser(): void {
    const api = this.getExcalidrawAPI();
    if (api && this.portal.isOpen()) {
      const elements = api.getSceneElementsIncludingDeleted();
      this.portal.broadcastScene(WS_SUBTYPES.INIT, elements, true);
    }
  }

  /**
   * Calculate scene version from elements
   */
  private getSceneVersion(elements: readonly ExcalidrawElement[]): number {
    return elements.reduce((acc, element) => acc + (element.version || 0), 0);
  }

  /**
   * Reset state
   */
  reset(): void {
    this.lastBroadcastedOrReceivedSceneVersion = -1;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.queueBroadcastAllElements?.cancel?.();
    this.reset();
  }
}
