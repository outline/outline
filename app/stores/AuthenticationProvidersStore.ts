import AuthenticationProvider from "~/models/AuthenticationProvider";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class AuthenticationProvidersStore extends BaseStore<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }
}
