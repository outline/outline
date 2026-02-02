import { action, observable } from "mobx";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";

export type DocumentReminder = {
  id: string;
  documentId: string;
  editorId: string;
  editor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  message: string | null;
  isActive: boolean;
  intervalDays: number | null;
  nextSendAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default class DocumentRemindersStore {
  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }
  @observable
  reminders: Map<string, DocumentReminder[]> = new Map();

  /**
   * Fetch all reminders for a document.
   */
  @action
  fetchReminders = async (documentId: string) => {
    const res = await client.post("/documents.reminders.list", {
      id: documentId,
    });

    if (res.data?.reminders) {
      this.reminders.set(documentId, res.data.reminders);
    }

    return res.data?.reminders || [];
  };

  /**
   * Create a new reminder.
   */
  @action
  create = async (params: {
    documentId: string;
    editorId: string;
    message?: string;
    intervalDays?: number | null;
    nextSendAt?: Date;
  }) => {
    const res = await client.post("/documents.reminders.create", {
      id: params.documentId,
      editorId: params.editorId,
      message: params.message,
      intervalDays: params.intervalDays,
      nextSendAt: params.nextSendAt?.toISOString(),
    });

    if (res.data) {
      const reminder = res.data;
      const existing = this.reminders.get(params.documentId) || [];
      this.reminders.set(params.documentId, [...existing, reminder]);
    }

    return res.data;
  };

  /**
   * Update an existing reminder.
   */
  @action
  update = async (params: {
    id: string;
    message?: string;
    isActive?: boolean;
    intervalDays?: number | null;
    nextSendAt?: Date;
  }) => {
    const res = await client.post("/documents.reminders.update", {
      ...params,
      nextSendAt: params.nextSendAt?.toISOString(),
    });

    if (res.data) {
      const reminder = res.data;
      const documentId = reminder.documentId;
      const existing = this.reminders.get(documentId) || [];
      const updated = existing.map((r) =>
        r.id === reminder.id ? reminder : r
      );
      this.reminders.set(documentId, updated);
    }

    return res.data;
  };

  /**
   * Delete a reminder.
   */
  @action
  delete = async (id: string) => {
    await client.post("/documents.reminders.delete", { id });

    // Remove from local state
    for (const [documentId, reminders] of this.reminders.entries()) {
      const filtered = reminders.filter((r) => r.id !== id);
      if (filtered.length !== reminders.length) {
        this.reminders.set(documentId, filtered);
        break;
      }
    }
  };

  /**
   * Get reminders for a document.
   */
  getReminders(documentId: string): DocumentReminder[] {
    return this.reminders.get(documentId) || [];
  }
}
