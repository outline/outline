import AuthenticationProvider from "~/models/AuthenticationProvider";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class AuthenticationProvidersStore extends Store<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Info, RPCAction.Update];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }

  getAllByName(name: string) {
    return this.orderedData.filter((provider) => provider.name === name);
  }

  getByName(name: string) {
    return this.orderedData.find((provider) => provider.name === name);
  }
}
