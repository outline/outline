import WebhookSubscription from "~/models/WebhookSubscription";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class WebhookSubscriptionsStore extends BaseStore<
  WebhookSubscription
> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, WebhookSubscription);
  }
}
