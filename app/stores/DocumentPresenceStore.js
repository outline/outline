// @flow
import { observable, action } from 'mobx';
import { USER_PRESENCE_INTERVAL } from 'shared/constants';

type DocumentPresence = Map<string, { isEditing: boolean, userId: string }>;

export default class PresenceStore {
  @observable data: Map<string, DocumentPresence> = new Map();
  timeouts: Map<string, TimeoutID> = new Map();

  // called to setup when we get the initial state from document.presence
  // websocket message. overrides any existing state
  @action
  init(documentId: string, userIds: string[], editingIds: string[]) {
    this.data.set(documentId, new Map());
    userIds.forEach(userId =>
      this.touch(documentId, userId, editingIds.includes(userId))
    );
  }

  // called when a user leave the room – user.leave websocket message.
  @action
  leave(documentId: string, userId: string) {
    const existing = this.data.get(documentId);
    if (existing) {
      existing.delete(userId);
    }
  }

  @action
  update(documentId: string, userId: string, isEditing: boolean) {
    const existing = this.data.get(documentId) || new Map();
    existing.set(userId, { isEditing, userId });
    this.data.set(documentId, existing);
  }

  // called when a user presence message is received – user.presence websocket
  // message.
  // While in edit mode a message is sent every USER_PRESENCE_INTERVAL, if
  // the other clients don't receive within USER_PRESENCE_INTERVAL*2 then a
  // timeout is triggered causing the users presence to default back to not
  // editing state as a safety measure.
  touch(documentId: string, userId: string, isEditing: boolean) {
    const id = `${documentId}-${userId}`;
    let timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    this.update(documentId, userId, isEditing);

    if (isEditing) {
      timeout = setTimeout(() => {
        this.update(documentId, userId, false);
      }, USER_PRESENCE_INTERVAL * 2);
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
