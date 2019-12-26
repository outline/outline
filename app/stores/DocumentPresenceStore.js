// @flow
import { observable, action } from 'mobx';

type DocumentPresence = Map<string, boolean>;

export default class PresenceStore {
  @observable data: Map<string, DocumentPresence> = new Map();

  @action
  update(documentId: string, userIds: string[]) {
    this.data.set(documentId, new Map());
    userIds.forEach(userId => this.join(documentId, userId));
  }

  @action
  join(documentId: string, userId: string) {
    const existing = this.data.get(documentId) || new Map();
    existing.set(userId, true);
    this.data.set(documentId, existing);
  }

  @action
  leave(documentId: string, userId: string) {
    const existing = this.data.get(documentId);
    if (existing) {
      existing.delete(userId);
    }
  }

  get(documentId: string) {
    const data = this.data.get(documentId);
    return data ? Array.from(data.keys()) : [];
  }

  @action
  clear() {
    this.data.clear();
  }
}
