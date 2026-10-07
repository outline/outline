import { orderBy } from "es-toolkit/compat";
import { override } from "mobx";
import AuthenticationProvider from "~/models/AuthenticationProvider";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class AuthenticationProvidersStore extends Store<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }

  @override
  get orderedData(): AuthenticationProvider[] {
    return orderBy(Array.from(this.data.values()), ["desc", "asc"]);
  }
}
