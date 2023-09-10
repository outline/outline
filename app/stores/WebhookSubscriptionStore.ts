import { computed } from "mobx";
import WebhookSubscription from "~/models/WebhookSubscription";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class WebhookSubscriptionsStore extends Store<WebhookSubscription> {
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
