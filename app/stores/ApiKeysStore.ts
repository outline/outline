import ApiKey from "~/models/ApiKey";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class ApiKeysStore extends BaseStore<ApiKey> {
  actions = [RPCAction.List, RPCAction.Create, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, ApiKey);
  }
}
