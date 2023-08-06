import AuthenticationProvider from "~/models/AuthenticationProvider";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class AuthenticationProvidersStore extends BaseStore<AuthenticationProvider> {
  actions = [RPCAction.List, RPCAction.Update];

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
