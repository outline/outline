import { orderBy, sortBy } from "es-toolkit/compat";
import { action, computed, makeObservable, override, runInAction } from "mobx";
import Notification from "~/models/Notification";
import type { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import type RootStore from "./RootStore";
import Store, { type PaginatedResponse, RPCAction } from "./base/Store";

export default class NotificationsStore extends Store<Notification> {
  actions = [RPCAction.List, RPCAction.Update];

  constructor(rootStore: RootStore) {
    super(rootStore, Notification);
    makeObservable(this);
  }

  fetchPage = async (
    options: ({ archived?: boolean } & PaginationParams) | undefined
  ): Promise<PaginatedResponse<Notification>> =>
    this.fetchPaginated("/notifications.list", options);

  /**
   * Mark all notifications as read.
   */
  @action
  markAllAsRead = async () => {
    await client.post("/notifications.update_all", {
      viewedAt: new Date().toISOString(),
    });

    runInAction(() => {
      const viewedAt = new Date();
      this.data.forEach((notification) => {
        notification.viewedAt = viewedAt;
      });
    });
  };

  /**
   * Mark all notifications as archived.
   */
  @action
  markAllAsArchived = async () => {
    await client.post("/notifications.update_all", {
      archivedAt: new Date().toISOString(),
    });

    runInAction(() => {
      this.clear();
    });
  };

  /**
   * Returns the approximate number of unread notifications.
   */
  @computed
  get approximateUnreadCount(): number {
    return this.active.filter((notification) => !notification.viewedAt).length;
  }

  /**
   * Returns the notifications in order of created date.
   */
  @override
  get orderedData(): Notification[] {
    return sortBy(
      orderBy(Array.from(this.data.values()), "createdAt", "desc"),
      (item) => (item.viewedAt ? 1 : -1)
    );
  }

  /**
   * Returns only the active (non-archived) notifications.
   */
  @computed
  get active(): Notification[] {
    return this.orderedData.filter((n) => !n.archivedAt);
  }
}
