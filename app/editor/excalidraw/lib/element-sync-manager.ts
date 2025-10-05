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
  private lastProcessedUpdateTime: number = 0;
  private lastProcessedUpdateHash: string = "";

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
      return;
    }

    if (!this.portal.isOpen()) {
      return;
    }

    const currentVersion = this.getSceneVersion(elements);
    if (currentVersion > this.lastBroadcastedOrReceivedSceneVersion) {
      this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
      this.lastBroadcastedOrReceivedSceneVersion = currentVersion;
      this.queueBroadcastAllElements?.();
    }
  }

  /**
   * Handle remote elements change from other collaborators
   */
  handleRemoteElementsChange(elements: readonly ExcalidrawElement[], messageType?: string): void {
    const api = this.getExcalidrawAPI();
    if (!api) {
      return;
    }

    // Defense in depth: prevent processing duplicate updates in quick succession
    // This guards against any remaining edge cases with duplicate event listeners
    const now = Date.now();
    const updateHash = `${messageType}:${elements.length}:${this.getSceneVersion(elements)}`;
    const timeSinceLastUpdate = now - this.lastProcessedUpdateTime;

    // If we processed the exact same update within 100ms, skip it
    if (timeSinceLastUpdate < 100 && updateHash === this.lastProcessedUpdateHash) {
      return;
    }

    this.lastProcessedUpdateTime = now;
    this.lastProcessedUpdateHash = updateHash;

    try {
      // Set flag to prevent broadcast loop
      this.isApplyingRemoteChanges = true;

      const localElements = api.getSceneElementsIncludingDeleted();

      // Determine if this is a full sync (INIT) or partial sync (UPDATE)
      const isFullSync = messageType === WS_SUBTYPES.INIT;
      const reconciledElements = reconcileElements(localElements, elements as ExcalidrawElement[], isFullSync);

      if (reconciledElements.hasChanges) {
        // Update version tracking
        this.lastBroadcastedOrReceivedSceneVersion = this.getSceneVersion(reconciledElements.elements);

        // Update Excalidraw - this will trigger onChange but we suppress broadcast with isApplyingRemoteChanges flag
        api.updateScene({
          elements: reconciledElements.elements,
        });
      }
    } catch (error) {
      // Silent error handling
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
    this.lastProcessedUpdateTime = 0;
    this.lastProcessedUpdateHash = "";
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.queueBroadcastAllElements?.cancel?.();
    this.reset();
  }
}
