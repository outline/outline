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

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  /**
   * Removes a user from the presence store
   *
   * @param documentId ID of the document to remove the user from
   * @param userId ID of the user to remove
   */
  @action
  public leave(documentId: string, userId: string) {
    const existing = this.data.get(documentId);

    if (existing) {
      existing.delete(userId);
    }
  }

  /**
   * Updates the presence store based on an awareness event from YJS
   *
   * @param documentId ID of the document the event is for
   * @param clientId ID of the client the event is for
   * @param event The awareness event
   */
  public updateFromAwarenessChangeEvent(
    documentId: string,
    clientId: number,
    event: AwarenessChangeEvent
  ) {
    const presence = this.data.get(documentId);
    let existingUserIds = (presence ? Array.from(presence.values()) : []).map(
      (p) => p.userId
    );

    event.states.forEach((state) => {
      const { user, cursor } = state;

      // To avoid loops we only want to update the presence for the current user
      // if it is also the current client.
      const isCurrentUser = this.rootStore.auth.currentUserId === user?.id;
      const isCurrentClient = clientId === state.clientId;

      if (user && (!isCurrentUser || !isCurrentClient)) {
        this.update(documentId, user.id, !!cursor);
        existingUserIds = existingUserIds.filter((id) => id !== user.id);
      }
    });

    existingUserIds.forEach((userId) => {
      this.leave(documentId, userId);
    });
  }

  /**
   * Updates the presence store to indicate that a user is present in a document
   * and then removes the user after a timeout of inactivity.
   *
   * @param documentId ID of the document to update
   * @param userId ID of the user to update
   * @param isEditing Whether the user is "editing" the document
   */
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

  /**
   * Updates the presence store to indicate that a user is present in a document.
   *
   * @param documentId ID of the document to update
   * @param userId ID of the user to update
   * @param isEditing Whether the user is "editing" the document
   */
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

  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private offlineTimeout = 30000;

  private rootStore: RootStore;
}
