import ApiKey from "~/models/ApiKey";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class ApiKeysStore extends Store<ApiKey> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, ApiKey);
  }
}
