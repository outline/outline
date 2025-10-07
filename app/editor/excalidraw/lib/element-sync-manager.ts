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
  private queueBroadcastAllElements: ReturnType<typeof throttle> | null = null;
  private isApplyingRemoteChanges: boolean = false;
  private lastProcessedUpdateTime: number = 0;
  private lastProcessedUpdateHash: string = "";
  private lastProcessedNonce: number = 0;

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

    // Fix #9: Improved deduplication using element version nonces
    // Calculate a nonce based on the sum of all element version nonces
    // This is more reliable than time-based deduplication
    const updateNonce = elements.reduce((sum, el) => sum + (el.versionNonce || 0), 0);
    const sceneVersion = this.getSceneVersion(elements);

    // Skip if this exact update (same nonce + version) was already processed
    if (updateNonce === this.lastProcessedNonce &&
        sceneVersion === this.lastBroadcastedOrReceivedSceneVersion) {
      return;
    }

    // Fallback time-based check for edge cases (e.g., empty scenes or version rollbacks)
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastProcessedUpdateTime;
    const updateHash = `${messageType}:${elements.length}:${sceneVersion}`;

    if (timeSinceLastUpdate < 50 && updateHash === this.lastProcessedUpdateHash) {
      return;
    }

    this.lastProcessedUpdateTime = now;
    this.lastProcessedUpdateHash = updateHash;
    this.lastProcessedNonce = updateNonce;

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
    this.lastProcessedNonce = 0;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.queueBroadcastAllElements?.cancel?.();
    this.reset();
  }
}
