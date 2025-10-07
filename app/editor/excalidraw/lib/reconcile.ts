/**
 * Element reconciliation logic for Excalidraw collaboration
 * Handles merging local and remote changes efficiently
 */

import { SYNCABLE_APP_STATE_FIELDS, type SyncableAppStateField } from "./constants";
import type { ExcalidrawElement, AppState } from "./types";

export interface ElementUpdate {
  id: string;
  element: ExcalidrawElement;
  action: "add" | "update" | "remove";
  version: number;
}

export interface ReconcileResult {
  elements: ExcalidrawElement[];
  hasChanges: boolean;
  updates: ElementUpdate[];
}

// Cache for element hashes to avoid recomputation
const elementHashCache = new WeakMap<ExcalidrawElement, string>();

/**
 * Fast hash function for element comparison
 * Uses key properties to generate a deterministic hash
 */
function hashElement(element: ExcalidrawElement): string {
  // Check cache first
  const cached = elementHashCache.get(element);
  if (cached) return cached;

  // Create hash from critical properties only
  // This avoids expensive JSON.stringify and focuses on properties that actually matter
  const parts = [
    element.id,
    element.version,
    element.versionNonce,
    element.type,
    element.x,
    element.y,
    element.width,
    element.height,
    element.angle || 0,
    element.isDeleted ? '1' : '0',
    element.opacity !== undefined ? element.opacity : 100,
    element.strokeColor || '',
    element.backgroundColor || '',
    element.fillStyle || '',
    element.strokeWidth !== undefined ? element.strokeWidth : 1,
    element.strokeStyle || '',
    element.roughness !== undefined ? element.roughness : 1,
    // For text elements
    element.text || '',
    element.fontSize || '',
    // For bound elements
    JSON.stringify(element.boundElements || []),
  ];

  const hash = parts.join('|');
  elementHashCache.set(element, hash);
  return hash;
}

/**
 * Fast element comparison focusing on key properties that indicate changes
 * Uses hash-based comparison for better performance
 */
function hasElementChanged(local: ExcalidrawElement, remote: ExcalidrawElement): boolean {
  // Fast-path checks first (most common cases)
  if (local.version !== remote.version) return true;
  if (local.versionNonce !== remote.versionNonce) return true;

  // Position/size checks (frequently changed)
  if (local.x !== remote.x || local.y !== remote.y) return true;
  if (local.width !== remote.width || local.height !== remote.height) return true;

  // Rotation and deletion
  if (local.angle !== remote.angle) return true;
  if (local.isDeleted !== remote.isDeleted) return true;

  // Type check (if type changed, definitely different)
  if (local.type !== remote.type) return true;

  // For more complex comparison, use hash-based approach
  // This is much faster than JSON.stringify
  return hashElement(local) !== hashElement(remote);
}

/**
 * Determines which element version should take precedence
 * Uses Excalidraw's conflict resolution strategy
 */
function resolveElementConflict(
  local: ExcalidrawElement,
  remote: ExcalidrawElement
): ExcalidrawElement {
  // Higher version wins
  if (remote.version > local.version) {
    return remote;
  }
  if (local.version > remote.version) {
    return local;
  }

  // Same version - use versionNonce for deterministic resolution
  if (remote.versionNonce > local.versionNonce) {
    return remote;
  }

  return local;
}

/**
 * Reconciles local and remote elements efficiently
 */
export function reconcileElements(
  localElements: ExcalidrawElement[],
  remoteElements: ExcalidrawElement[],
  isFullSync: boolean = false
): ReconcileResult {
  const localMap = new Map<string, ExcalidrawElement>();
  const remoteMap = new Map<string, ExcalidrawElement>();
  const updates: ElementUpdate[] = [];

  // Build lookup maps
  localElements.forEach(el => localMap.set(el.id, el));
  remoteElements.forEach(el => remoteMap.set(el.id, el));

  const reconciledElements: ExcalidrawElement[] = [];
  const processedIds = new Set<string>();

  // Process remote elements (they may contain new or updated elements)
  // Fix #7: Only create new refs when elements actually changed
  for (const remoteElement of remoteElements) {
    const localElement = localMap.get(remoteElement.id);
    processedIds.add(remoteElement.id);

    if (!localElement) {
      // New element from remote - create new reference to ensure React detects change
      reconciledElements.push({...remoteElement});
      updates.push({
        id: remoteElement.id,
        element: remoteElement,
        action: "add",
        version: remoteElement.version
      });
    } else if (hasElementChanged(localElement, remoteElement)) {
      // Element exists locally and remotely but has changes
      const resolvedElement = resolveElementConflict(localElement, remoteElement);
      // Create new reference only when using the resolved element
      reconciledElements.push({...resolvedElement});

      if (resolvedElement === remoteElement) {
        updates.push({
          id: remoteElement.id,
          element: remoteElement,
          action: "update",
          version: remoteElement.version
        });
      }
    } else {
      // No changes, reuse existing reference (Fix #7: optimize re-renders)
      reconciledElements.push(localElement);
    }
  }

  // Process local elements that weren't in remote
  // Fix #7: Only create new refs when elements actually changed
  for (const localElement of localElements) {
    if (!processedIds.has(localElement.id)) {
      if (isFullSync) {
        // In full sync (INIT), if an element exists locally but not remotely, it should be removed
        if (!localElement.isDeleted) {
          updates.push({
            id: localElement.id,
            element: localElement,
            action: "remove",
            version: localElement.version
          });
        }
      } else {
        // In partial sync (UPDATE), preserve local elements that aren't in the update
        // Reuse existing reference (Fix #7: optimize re-renders)
        reconciledElements.push(localElement);
      }
    }
  }

  // Sort elements by index to maintain order
  reconciledElements.sort((a, b) => (a.index || 0) - (b.index || 0));

  return {
    elements: reconciledElements,
    hasChanges: updates.length > 0,
    updates
  };
}

/**
 * Efficiently compares two arrays of elements to detect changes
 */
export function detectElementChanges(
  previousElements: ExcalidrawElement[],
  currentElements: ExcalidrawElement[]
): ElementUpdate[] {
  const previousMap = new Map<string, ExcalidrawElement>();
  const currentMap = new Map<string, ExcalidrawElement>();
  const updates: ElementUpdate[] = [];

  previousElements.forEach(el => previousMap.set(el.id, el));
  currentElements.forEach(el => currentMap.set(el.id, el));

  // Check for new and updated elements
  for (const currentElement of currentElements) {
    const previousElement = previousMap.get(currentElement.id);

    if (!previousElement) {
      updates.push({
        id: currentElement.id,
        element: currentElement,
        action: "add",
        version: currentElement.version
      });
    } else if (hasElementChanged(previousElement, currentElement)) {
      updates.push({
        id: currentElement.id,
        element: currentElement,
        action: "update",
        version: currentElement.version
      });
    }
  }

  // Check for removed elements
  for (const previousElement of previousElements) {
    if (!currentMap.has(previousElement.id)) {
      updates.push({
        id: previousElement.id,
        element: previousElement,
        action: "remove",
        version: previousElement.version
      });
    }
  }

  return updates;
}

/**
 * Reconciles app state changes, only syncing relevant fields
 */
export function reconcileAppState(
  localAppState: Partial<AppState>,
  remoteAppState: Partial<AppState>
): { appState: Partial<AppState>; hasChanges: boolean } {
  const reconciledAppState: Partial<AppState> = { ...localAppState };
  let hasChanges = false;

  for (const field of SYNCABLE_APP_STATE_FIELDS) {
    const localValue = localAppState[field];
    const remoteValue = remoteAppState[field];

    if (remoteValue !== undefined && remoteValue !== localValue) {
      reconciledAppState[field] = remoteValue;
      hasChanges = true;
    }
  }

  return { appState: reconciledAppState, hasChanges };
}

/**
 * Creates a version map for efficient tracking of element versions
 */
export function createVersionMap(elements: ExcalidrawElement[]): Map<string, number> {
  const versionMap = new Map<string, number>();
  elements.forEach(element => {
    versionMap.set(element.id, element.version);
  });
  return versionMap;
}

/**
 * Filters elements that need to be synced based on version differences
 */
export function filterSyncableElements(
  elements: ExcalidrawElement[],
  lastSyncedVersions: Map<string, number>
): ExcalidrawElement[] {
  return elements.filter(element => {
    const lastVersion = lastSyncedVersions.get(element.id);
    return lastVersion === undefined || element.version > lastVersion;
  });
}