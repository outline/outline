// @flow
import { observable, action } from 'mobx';

type DocumentPresence = Map<string, { isEditing: boolean, userId: string }>;

export default class PresenceStore {
  @observable data: Map<string, DocumentPresence> = new Map();
  timeouts: Map<string, TimeoutID> = new Map();

  @action
  init(documentId: string, userIds: string[], editingIds: string[]) {
    this.data.set(documentId, new Map());
    userIds.forEach(userId =>
      this.touch(documentId, userId, editingIds.includes(userId))
    );
  }

  join(documentId: string, userId: string, isEditing: boolean) {
    this.update(documentId, userId, isEditing);
  }

  @action
  update(documentId: string, userId: string, isEditing: boolean) {
    const existing = this.data.get(documentId) || new Map();
    existing.set(userId, { isEditing, userId });
    this.data.set(documentId, existing);
  }

  @action
  leave(documentId: string, userId: string) {
    const existing = this.data.get(documentId);
    if (existing) {
      existing.delete(userId);
    }
  }

  @action
  touch(documentId: string, userId: string, isEditing: boolean) {
    const id = `${documentId}-${userId}`;
    let timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(userId);
    }

    this.update(documentId, userId, isEditing);

    if (isEditing) {
      timeout = setTimeout(() => {
        this.update(documentId, userId, false);
      }, 10 * 1000);
      this.timeouts.set(id, timeout);
    }
  }

  get(documentId: string): ?DocumentPresence {
    return this.data.get(documentId);
  }

  @action
  clear() {
    this.data.clear();
  }
}
