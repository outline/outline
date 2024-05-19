import invariant from "invariant";
import orderBy from "lodash/orderBy";
import sortBy from "lodash/sortBy";
import { action, computed, runInAction } from "mobx";
import Notification from "~/models/Notification";
import { PaginationParams } from "~/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class NotificationsStore extends Store<Notification> {
  actions = [RPCAction.List, RPCAction.Update];

  constructor(rootStore: RootStore) {
    super(rootStore, Notification);
  }

  @action
  fetchPage = async (
    options: PaginationParams | undefined
  ): Promise<Notification[]> => {
    this.isFetching = true;

    try {
      const res = await client.post("/notifications.list", options);
      invariant(res?.data, "Document revisions not available");

      let models: Notification[] = [];
      runInAction("NotificationsStore#fetchPage", () => {
        models = res.data.notifications.map(this.add);
        this.isLoaded = true;
      });

      return models;
    } finally {
      this.isFetching = false;
    }
  };

  /**
   * Mark all notifications as read.
   */
  @action
  markAllAsRead = async () => {
    await client.post("/notifications.update_all", {
      viewedAt: new Date().toISOString(),
    });

    runInAction("NotificationsStore#markAllAsRead", () => {
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

    runInAction("NotificationsStore#markAllAsArchived", () => {
      this.clear();
    });
  };

  /**
   * Returns the approximate number of unread notifications.
   */
  @computed
  get approximateUnreadCount(): number {
    return this.orderedData.filter((notification) => !notification.viewedAt)
      .length;
  }

  /**
   * Returns the notifications in order of created date.
   */
  @computed
  get orderedData(): Notification[] {
    return sortBy(
      orderBy(Array.from(this.data.values()), "createdAt", "desc"),
      (item) => {
        item.viewedAt ? 1 : -1;
      }
    );
  }
}
