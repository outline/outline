// @flow
import ApiKey from "models/ApiKey";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class ApiKeysStore extends BaseStore<ApiKey> {
  actions = ["list", "create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, ApiKey);
  }
}
