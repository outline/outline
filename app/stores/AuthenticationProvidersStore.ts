import AuthenticationProvider from "~/models/AuthenticationProvider";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class AuthenticationProvidersStore extends Store<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }
}
