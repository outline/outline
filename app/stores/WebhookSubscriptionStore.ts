import { computed } from "mobx";
import WebhookSubscription from "~/models/WebhookSubscription";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class WebhookSubscriptionsStore extends Store<WebhookSubscription> {
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
