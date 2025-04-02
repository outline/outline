import OAuthClient from "~/models/OAuthClient";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class OAuthClientsStore extends Store<OAuthClient> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, OAuthClient);
  }
}
