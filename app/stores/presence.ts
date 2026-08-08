import { create } from "zustand";
import type { AwarenessChangeEvent } from "~/types";

/** Presence of each user currently in a document, keyed by user id. */
export type DocumentPresence = Map<
  string,
  {
    isEditing: boolean;
    userId: string;
  }
>;

/** How long a user stays present without a further update. */
const OFFLINE_TIMEOUT = 30000;

/** Pending removal timers, keyed by `${documentId}-${userId}`. */
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

interface PresenceState {
  /** Presence per document, keyed by document id. */
  data: Map<string, DocumentPresence>;
  leave: (documentId: string, userId: string) => void;
  touch: (documentId: string, userId: string, isEditing: boolean) => void;
  updateFromAwarenessChangeEvent: (
    documentId: string,
    clientId: number,
    event: AwarenessChangeEvent,
    currentUserId?: string | null
  ) => void;
  get: (documentId: string) => DocumentPresence | undefined;
  clear: () => void;
}

/**
 * Which users are present in each document, driven by Y.js awareness.
 *
 * Updates replace the maps they touch rather than mutating them, so selectors
 * reading a single document's presence only re-render when that document
 * changes.
 */
export const usePresence = create<PresenceState>((set, get) => {
  const update = (documentId: string, userId: string, isEditing: boolean) => {
    set((state) => {
      const presence = state.data.get(documentId);
      const existing = presence?.get(userId);

      if (existing && existing.isEditing === isEditing) {
        return state;
      }

      const nextPresence: DocumentPresence = new Map(presence);
      nextPresence.set(userId, { isEditing, userId });

      const data = new Map(state.data);
      data.set(documentId, nextPresence);
      return { data };
    });
  };

  return {
    data: new Map(),

    leave: (documentId, userId) => {
      set((state) => {
        const presence = state.data.get(documentId);
        if (!presence?.has(userId)) {
          return state;
        }

        const nextPresence: DocumentPresence = new Map(presence);
        nextPresence.delete(userId);

        const data = new Map(state.data);
        data.set(documentId, nextPresence);
        return { data };
      });
    },

    touch: (documentId, userId, isEditing) => {
      const id = `${documentId}-${userId}`;
      const timeout = timeouts.get(id);

      if (timeout) {
        clearTimeout(timeout);
        timeouts.delete(id);
      }

      update(documentId, userId, isEditing);

      timeouts.set(
        id,
        setTimeout(() => {
          get().leave(documentId, userId);
        }, OFFLINE_TIMEOUT)
      );
    },

    updateFromAwarenessChangeEvent: (
      documentId,
      clientId,
      event,
      currentUserId
    ) => {
      const presence = get().data.get(documentId);
      let departedUserIds = Array.from(presence?.values() ?? []).map(
        (entry) => entry.userId
      );

      event.states.forEach((state) => {
        const { user, cursor } = state;

        // To avoid loops we only want to update the presence for the current
        // user if it is also the current client.
        const isCurrentUser = currentUserId === user?.id;
        const isCurrentClient = clientId === state.clientId;

        if (user && (!isCurrentUser || !isCurrentClient)) {
          update(documentId, user.id, !!cursor);
          departedUserIds = departedUserIds.filter((id) => id !== user.id);
        }
      });

      departedUserIds.forEach((userId) => {
        get().leave(documentId, userId);
      });
    },

    get: (documentId) => get().data.get(documentId),

    clear: () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      set({ data: new Map() });
    },
  };
});

/**
 * The presence of everyone in a document, for use during render.
 *
 * @param documentId the document to observe.
 * @returns the document's presence, or undefined when nobody is present.
 */
export function useDocumentPresence(
  documentId: string
): DocumentPresence | undefined {
  return usePresence((state) => state.data.get(documentId));
}
