// @flow
import { observable, action } from 'mobx';

type DocumentPresence = Map<string, { isEditing: boolean, userId: string }>;

export default class PresenceStore {
  @observable data: Map<string, DocumentPresence> = new Map();
  editingTimeout: ?TimeoutID;

  @action
  init(documentId: string, userIds: string[], editingIds: string[]) {
    this.data.set(documentId, new Map());
    userIds.forEach(userId =>
      this.update(documentId, userId, editingIds.includes(userId))
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
    if (this.editingTimeout) {
      clearTimeout(this.editingTimeout);
    }

    this.update(documentId, userId, isEditing);
    console.log({ documentId, userId, isEditing });

    this.editingTimeout = setTimeout(() => {
      console.log('EDITING TIMEOUT');
      this.update(documentId, userId, false);
    }, 10 * 1000);
  }

  get(documentId: string): ?DocumentPresence {
    return this.data.get(documentId);
  }

  @action
  clear() {
    this.data.clear();
  }
}
