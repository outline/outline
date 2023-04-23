import { orderBy, sortBy } from "lodash";
import { computed } from "mobx";
import Notification from "~/models/Notification";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class NotificationsStore extends BaseStore<Notification> {
  actions = [RPCAction.List];

  constructor(rootStore: RootStore) {
    super(rootStore, Notification);
  }

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
