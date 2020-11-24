// @flow
import Policy from "models/Policy";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class PoliciesStore extends BaseStore<Policy> {
  actions = [];

  constructor(rootStore: RootStore) {
    super(rootStore, Policy);
  }

  abilities(id: string) {
    const policy = this.get(id);
    return policy ? policy.abilities : {};
  }
}
