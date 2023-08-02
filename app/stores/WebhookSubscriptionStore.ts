import { computed } from "mobx";
import WebhookSubscription from "~/models/WebhookSubscription";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class WebhookSubscriptionsStore extends BaseStore<WebhookSubscription> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Delete,
    RPCAction.Update,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, WebhookSubscription);
  }

  @computed
  get enabled() {
    return this.orderedData.filter((subscription) => subscription.enabled);
  }

  @computed
  get disabled() {
    return this.orderedData.filter((subscription) => !subscription.enabled);
  }
}
