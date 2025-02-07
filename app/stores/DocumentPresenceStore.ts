import { observable, action } from "mobx";
import { AwarenessChangeEvent } from "~/types";
import RootStore from "./RootStore";

type DocumentPresence = Map<
  string,
  {
    isEditing: boolean;
    userId: string;
  }
>;

export default class PresenceStore {
  @observable
  data: Map<string, DocumentPresence> = new Map();

  timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  offlineTimeout = 30000;

  private rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  // called when a user leaves the document
  @action
  public leave(documentId: string, userId: string) {
    const existing = this.data.get(documentId);

    if (existing) {
      existing.delete(userId);
    }
  }

  public updateFromAwarenessChangeEvent(
    documentId: string,
    event: AwarenessChangeEvent
  ) {
    const presence = this.data.get(documentId);
    let existingUserIds = (presence ? Array.from(presence.values()) : []).map(
      (p) => p.userId
    );

    event.states.forEach((state) => {
      const { user, cursor } = state;
      if (user && this.rootStore.auth.currentUserId !== user.id) {
        this.update(documentId, user.id, !!cursor);
        existingUserIds = existingUserIds.filter((id) => id !== user.id);
      }
    });

    existingUserIds.forEach((userId) => {
      this.leave(documentId, userId);
    });
  }

  public touch(documentId: string, userId: string, isEditing: boolean) {
    const id = `${documentId}-${userId}`;
    let timeout = this.timeouts.get(id);

    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    this.update(documentId, userId, isEditing);

    timeout = setTimeout(() => {
      this.leave(documentId, userId);
    }, this.offlineTimeout);
    this.timeouts.set(id, timeout);
  }

  @action
  private update(documentId: string, userId: string, isEditing: boolean) {
    const presence = this.data.get(documentId) || new Map();
    const existing = presence.get(userId);

    if (!existing || existing.isEditing !== isEditing) {
      presence.set(userId, {
        isEditing,
        userId,
      });
      this.data.set(documentId, presence);
    }
  }

  public get(documentId: string): DocumentPresence | null | undefined {
    return this.data.get(documentId);
  }

  @action
  public clear() {
    this.data.clear();
  }
}
