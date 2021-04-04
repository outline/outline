// @flow
import AuthenticationProvider from "models/AuthenticationProvider";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class AuthenticationProvidersStore extends BaseStore<AuthenticationProvider> {
  actions = ["list", "create", "update"];

  constructor(rootStore: RootStore) {
    super(rootStore, AuthenticationProvider);
  }
}
