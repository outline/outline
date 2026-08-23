import { create } from "zustand";
import type { AwarenessChangeEvent } from "~/types";
/** Presence of each user currently in a document, keyed by user id. */
export type NotePresence = Map<
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
  data: Map<string, NotePresence>;
  leave: (noteId: string, userId: string) => void;
  touch: (noteId: string, userId: string, isEditing: boolean) => void;
  updateFromAwarenessChangeEvent: (
    noteId: string,
    clientId: number,
    event: AwarenessChangeEvent,
    currentUserId?: string | null
  ) => void;
  get: (noteId: string) => NotePresence | undefined;
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
  const update = (noteId: string, userId: string, isEditing: boolean) => {
    set((state) => {
      const presence = state.data.get(noteId);
      const existing = presence?.get(userId);
      if (existing && existing.isEditing === isEditing) {
        return state;
      }
      const nextPresence: NotePresence = new Map(presence);
      nextPresence.set(userId, { isEditing, userId });
      const data = new Map(state.data);
      data.set(noteId, nextPresence);
      return { data };
    });
  };
  return {
    data: new Map(),
    leave: (noteId, userId) => {
      set((state) => {
        const presence = state.data.get(noteId);
        if (!presence?.has(userId)) {
          return state;
        }
        const nextPresence: NotePresence = new Map(presence);
        nextPresence.delete(userId);
        const data = new Map(state.data);
        data.set(noteId, nextPresence);
        return { data };
      });
    },
    touch: (noteId, userId, isEditing) => {
      const id = `${noteId}-${userId}`;
      const timeout = timeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        timeouts.delete(id);
      }
      update(noteId, userId, isEditing);
      timeouts.set(
        id,
        setTimeout(() => {
          get().leave(noteId, userId);
        }, OFFLINE_TIMEOUT)
      );
    },
    updateFromAwarenessChangeEvent: (
      noteId,
      clientId,
      event,
      currentUserId
    ) => {
      const presence = get().data.get(noteId);
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
          update(noteId, user.id, !!cursor);
          departedUserIds = departedUserIds.filter((id) => id !== user.id);
        }
      });
      departedUserIds.forEach((userId) => {
        get().leave(noteId, userId);
      });
    },
    get: (noteId) => get().data.get(noteId),
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
export function useNotePresence(noteId: string): NotePresence | undefined {
  return usePresence((state) => state.data.get(noteId));
}
