import Subscription from "~/models/Subscription";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class SubscriptionsStore extends BaseStore<Subscription> {
  actions = [
    RPCAction.Info,
    // list is disabled.
    // RPCAction.List
    RPCAction.Create,
    RPCAction.Delete,
    RPCAction.Update,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, Subscription);
  }
}
