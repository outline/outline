import Policy from "~/models/Policy";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class PoliciesStore extends Store<Policy> {
  actions = [];

  constructor(rootStore: RootStore) {
    super(rootStore, Policy);
  }

  abilities(id: string) {
    const policy = this.get(id);
    return policy ? policy.abilities : {};
  }
}
