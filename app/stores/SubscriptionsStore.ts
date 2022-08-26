import Subscription from "~/models/Subscription";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class SubscriptionsStore extends BaseStore<Subscription> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }
}
