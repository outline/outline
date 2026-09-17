import {
  HocuspocusProvider,
  type HocuspocusProviderConfiguration,
} from "@hocuspocus/provider";
import { Second } from "@shared/utils/time";
import type { IndexeddbPersistence } from "./IndexeddbPersistence";

/** How long a local change may await the server echo before it is unsynced. */
const unsyncedGracePeriod = 2 * Second.ms;

export type CollaborationProviderConfiguration =
  HocuspocusProviderConfiguration & {
    /** Local persistence for the same document, if available. */
    localProvider?: IndexeddbPersistence;
  };

/** The state of the connection to the collaboration server. */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | void;

/** Emitted when the connection status changes. */
export interface ConnectionStatusEvent {
  status: ConnectionStatus;
}

/** Emitted for incoming, outgoing and close messages of the connection. */
export interface ConnectionMessageEvent {
  message: string;
  event: Event & {
    code?: number;
  };
}

export interface SyncStateEvent {
  /** Whether there are local edits the server has not confirmed. */
  hasUnsyncedChanges: boolean;
  /** Whether edits are also stored in the browser, so they survive a reload. */
  hasLocalPersistence: boolean;
}

/**
 * A Hocuspocus provider that also tracks whether local edits have reached the
 * server, and emits a "syncStateChange" event whenever that changes.
 */
export class CollaborationProvider extends HocuspocusProvider {
  constructor(configuration: CollaborationProviderConfiguration) {
    const { localProvider, ...rest } = configuration;
    super(rest);
    this.localProvider = localProvider;
    this.localPersistence = !!localProvider;

    this.document.on("update", this.handleDocumentUpdate);
    this.on("synced", this.updateSyncState);
    this.updateSyncState();
  }

  /** Whether there are local edits the server has not confirmed. */
  get hasPendingChanges(): boolean {
    return this.syncState.hasUnsyncedChanges;
  }

  /** Whether edits are also stored in the browser, so they survive a reload. */
  get hasLocalPersistence(): boolean {
    return this.localPersistence;
  }

  /**
   * Records whether local persistence is working, for example after IndexedDB
   * turned out to be unusable.
   *
   * @param value whether edits are stored in the browser.
   */
  setLocalPersistence(value: boolean) {
    this.localPersistence = value;
    this.updateSyncState();
  }

  onMessage(event: Parameters<HocuspocusProvider["onMessage"]>[0]) {
    super.onMessage(event);
    this.updateSyncState();
  }

  destroy() {
    this.clearUnsyncedTimeout();
    this.document.off("update", this.handleDocumentUpdate);
    super.destroy();
  }

  private localProvider?: IndexeddbPersistence;

  private localPersistence: boolean;

  /** The last state reported to listeners. */
  private syncState: SyncStateEvent = {
    hasUnsyncedChanges: false,
    hasLocalPersistence: true,
  };

  /** Whether an edit was made since the server last confirmed a full sync. */
  private editedSinceSync = false;

  private unsyncedTimeout?: ReturnType<typeof setTimeout>;

  private handleDocumentUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin !== this && origin !== this.localProvider) {
      this.editedSinceSync = true;
    }
    this.updateSyncState();
  };

  // While synced the inherited count is reliable, as the server echoes every
  // update back. Otherwise fall back to whether an edit was made since the
  // last confirmed sync, as the count is reset on every reconnect.
  private updateSyncState = () => {
    if (this.synced && !this.hasUnsyncedChanges) {
      this.editedSinceSync = false;
    }
    const hasUnsyncedChanges = this.synced
      ? this.hasUnsyncedChanges
      : this.editedSinceSync;

    // A connected server echoes each update within milliseconds, so only
    // report changes as unsynced once they have been pending for a while.
    if (hasUnsyncedChanges && this.synced) {
      this.unsyncedTimeout ??= setTimeout(() => {
        this.unsyncedTimeout = undefined;
        this.emitSyncState(true);
      }, unsyncedGracePeriod);
      return;
    }
    this.clearUnsyncedTimeout();
    this.emitSyncState(hasUnsyncedChanges);
  };

  private emitSyncState(hasUnsyncedChanges: boolean) {
    const next: SyncStateEvent = {
      hasUnsyncedChanges,
      hasLocalPersistence: this.localPersistence,
    };
    if (
      next.hasUnsyncedChanges === this.syncState.hasUnsyncedChanges &&
      next.hasLocalPersistence === this.syncState.hasLocalPersistence
    ) {
      return;
    }
    this.syncState = next;
    this.emit("syncStateChange", next);
  }

  private clearUnsyncedTimeout() {
    if (this.unsyncedTimeout !== undefined) {
      clearTimeout(this.unsyncedTimeout);
      this.unsyncedTimeout = undefined;
    }
  }
}
