import orderBy from "lodash/orderBy";
import { computed } from "mobx";
import AuthenticationProvider from "~/models/AuthenticationProvider";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class AuthenticationProvidersStore extends Store<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }

  @computed
  get orderedData(): AuthenticationProvider[] {
    return orderBy(Array.from(this.data.values()), ["desc", "asc"]);
  }
}
