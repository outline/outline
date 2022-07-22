import WebhookDelivery from "~/models/WebhookDelivery";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class WebhookDerliveriesStore extends BaseStore<
  WebhookDelivery
> {
  actions = [RPCAction.List];

  constructor(rootStore: RootStore) {
    super(rootStore, WebhookDelivery);
  }
}
