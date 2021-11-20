import { find } from "lodash";
import NotificationSetting from "~/models/NotificationSetting";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class NotificationSettingsStore extends BaseStore<
  NotificationSetting
> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, NotificationSetting);
  }

  getByEvent = (event: string) => {
    return find(this.orderedData, {
      event,
    });
  };
}
