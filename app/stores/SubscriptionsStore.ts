import Subscription from "~/models/Subscription";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class SubscriptionsStore extends Store<Subscription> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }
}
